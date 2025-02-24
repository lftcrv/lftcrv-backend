import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { IDockerService } from '../interfaces/docker-service.interface';
import * as Docker from 'dockerode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AgentStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CreateElizaContainerConfig,
  ElizaContainerResult,
  IElizaConfigService,
  ServiceTokens,
} from '../interfaces';

@Injectable()
export class DockerService implements IDockerService, OnModuleInit {
  private docker: Docker;
  private readonly elizaBasePath: string;
  private readonly elizaEnvPath: string;
  private readonly startPort = 3001;
  private readonly maxPort = 3999;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ServiceTokens.ElizaConfig)
    private readonly elizaConfig: IElizaConfigService,
  ) {
    this.docker = new Docker();
    this.elizaBasePath = path.join(process.cwd(), 'config');
    this.elizaEnvPath = path.join(this.elizaBasePath, 'agents');
  }

  private async findAvailablePort(): Promise<number> {
    const usedPorts = await this.prisma.elizaAgent.findMany({
      where: {
        port: { not: null },
        status: { not: AgentStatus.STOPPED },
      },
      select: { port: true },
    });

    const usedPortSet = new Set(usedPorts.map((a) => a.port));

    for (let port = this.startPort; port <= this.maxPort; port++) {
      if (!usedPortSet.has(port)) {
        return port;
      }
    }

    throw new Error('No available ports found');
  }

  /**
   * Initializes the service by creating required directories and validating environment
   * @throws Error if environment files or Docker image are missing
   */
  async onModuleInit() {
    // Create required directories
    await fs.mkdir(this.elizaEnvPath, { recursive: true });

    // Verify Docker image exists
    const images = await this.docker.listImages();
    const baseImage = images.find((img) =>
      img.RepoTags?.includes('starknet-agent-kit:latest'),
    );

    if (!baseImage) {
      throw new Error(
        'Base Agent image not found. Please build it first using ./scripts/docker.sh build',
      );
    }
  }

  /**
   * Creates a new Docker container with the specified configuration, listening on returned port
   * @param config Container configuration including name and character settings
   * @returns Container ID, Port used
   */
  async createContainer(
    config: CreateElizaContainerConfig,
  ): Promise<ElizaContainerResult> {
    console.log('🚀 Starting container creation for agent:', config.name);

    const port = await this.findAvailablePort();
    console.log('📍 Found available port:', port);

    // Create agent config directory
    const agentConfigPath = path.join(this.elizaEnvPath, config.name);
    await fs.mkdir(agentConfigPath, { recursive: true });
    console.log('📁 Created agent config directory:', agentConfigPath);

    // Write the agent configuration file
    const agentConfigFile = path.join(agentConfigPath, 'default.agent.json');
    await fs.writeFile(
      agentConfigFile,
      JSON.stringify(config.characterConfig, null, 2),
    );
    console.log('📝 Written agent configuration to:', agentConfigFile);

    // Create agent-specific .env file
    const agentEnvFile = path.join(agentConfigPath, '.env');
    const envVars = this.elizaConfig.generateContainerEnv(config);

    console.log('🔧 Generated environment variables for container:');
    envVars.forEach((env) => {
      const [key, value] = env.split('=');
      // Mask sensitive values
      if (key.includes('KEY') || key.includes('PRIVATE')) {
        console.log(`  ${key}=***[MASKED]***`);
      } else {
        console.log(`  ${key}=${value}`);
      }
    });

    await fs.writeFile(agentEnvFile, envVars.join('\n'));
    console.log('📝 Written environment variables to:', agentEnvFile);

    console.log('🔄 Creating Docker container with configuration:');
    console.log('  Image:', 'starknet-agent-kit:latest');
    console.log('  Name:', `agent-${config.name}`);
    console.log('  Port mapping:', `${port}:8080`);
    console.log('  Mounted volumes:');
    console.log(`    - ${this.elizaBasePath} -> /app/config`);
    console.log(
      `    - ${agentConfigFile} -> /app/config/agents/default.agent.json`,
    );
    console.log(`    - ${agentEnvFile} -> /app/.env`);

    const container = await this.docker.createContainer({
      Image: 'starknet-agent-kit:latest',
      name: `agent-${config.name}`,
      Env: envVars,
      HostConfig: {
        Binds: [
          `${this.elizaBasePath}:/app/config`,
          `${agentConfigFile}:/app/config/agents/default.agent.json`,
          `${agentEnvFile}:/app/.env`,
        ],
        PortBindings: {
          '8080/tcp': [{ HostPort: port.toString() }],
        },
      },
      ExposedPorts: {
        '8080/tcp': {},
      },
    });

    const containerId = container.id;
    console.log('✅ Container created successfully:', {
      containerId: containerId.substring(0, 12),
      port,
      name: config.name,
    });

    return { containerId, port };
  }

  private async waitForLog(containerId: string): Promise<string | null> {
    const container = this.docker.getContainer(containerId);
    const startTime = Date.now();
    const TIMEOUT = 5 * 60 * 1000; // 5 minutes timeout
    const POLL_INTERVAL = 5000; // Check every 5 seconds

    while (Date.now() - startTime < TIMEOUT) {
      try {
        const logs = await container.logs({
          stdout: true,
          stderr: true,
          tail: 1000,
        });
        const logsStr = logs.toString('utf8');

        if (
          logsStr.includes('Application is running on: http://127.0.0.1:8080')
        ) {
          console.log('✅ Agent container started successfully');
          return containerId;
        }

        if (logsStr.includes('[NestFactory] Starting Nest application')) {
          console.log('⏳ NestJS application starting...');
        } else if (logsStr.includes('AppModule dependencies initialized')) {
          console.log('⏳ Modules initialization in progress...');
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      } catch (error) {
        console.error(`❌ Error checking container logs: ${error.message}`);
        return null;
      }
    }

    console.error('❌ Timeout waiting for container startup');
    return null;
  }

  async getRuntimeAgentId(containerId: string): Promise<string | null> {
    return this.waitForLog(containerId);
  }

  /**
   * Starts a container by its ID
   * @param containerId The ID of the container to start
   */
  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.start();
  }

  /**
   * Stops a container by its ID
   * @param containerId The ID of the container to stop
   */
  async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.stop();
  }

  /**
   * Removes a container and cleans up associated files
   * @param containerId The ID of the container to remove
   */
  async removeContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    const containerInfo = await container.inspect();
    const name = containerInfo.Name.replace('/agent-', '');

    // Remove container
    await container.remove({ force: true });

    // Clean up files
    try {
      const agentConfigPath = path.join(this.elizaEnvPath, name);
      await fs.rm(agentConfigPath, { recursive: true });
    } catch (error) {
      console.error('Error cleaning up config files:', error);
    }
  }
}
