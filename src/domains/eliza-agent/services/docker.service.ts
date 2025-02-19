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
  private readonly dataPath: string;
  private readonly charactersPath: string;
  private readonly startPort = 3001;
  private readonly maxPort = 3999;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ServiceTokens.ElizaConfig)
    private readonly elizaConfig: IElizaConfigService,
  ) {
    this.docker = new Docker();
    this.elizaBasePath = path.join(process.cwd(), 'docker', 'eliza');
    this.elizaEnvPath = path.join(this.elizaBasePath, '.env');
    this.dataPath = path.join(this.elizaBasePath, 'agent', 'data');
    this.charactersPath = path.join(this.elizaBasePath, 'characters');
  }

  private async findAvailablePort(): Promise<number> {
    // Récupérer tous les ports utilisés
    const usedPorts = await this.prisma.elizaAgent.findMany({
      where: {
        port: { not: null },
        status: { not: AgentStatus.STOPPED },
      },
      select: { port: true },
    });

    const usedPortSet = new Set(usedPorts.map((a) => a.port));

    // Chercher le premier port disponible
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
    await fs.mkdir(this.dataPath, { recursive: true });
    await fs.mkdir(this.charactersPath, { recursive: true });

    // Verify Eliza .env file exists
    try {
      await fs.access(this.elizaEnvPath);
    } catch {
      throw new Error(`Eliza .env file not found at ${this.elizaEnvPath}`);
    }

    // Verify Docker image exists
    const images = await this.docker.listImages();
    const baseImage = images.find((img) =>
      img.RepoTags?.includes('julienbrs/eliza:latest'),
    );

    if (!baseImage) {
      throw new Error(
        'Base Eliza image not found. Please build it first using ./scripts/docker.sh build',
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
    const port = await this.findAvailablePort();

    const agentDataPath = path.join(this.dataPath, config.name);
    await fs.mkdir(agentDataPath, { recursive: true });

    const characterPath = path.join(
      this.charactersPath,
      `${config.name}.character.json`,
    );
    await fs.writeFile(
      characterPath,
      JSON.stringify(config.characterConfig, null, 2),
    );

    // Generate environment variables for the container
    const containerEnv = this.elizaConfig.generateContainerEnv(config);

    const container = await this.docker.createContainer({
      Image: 'julienbrs/eliza:latest',
      name: `eliza-${config.name}`,
      Env: containerEnv,
      Cmd: [
        'pnpm',
        'start',
        `--character=characters/${config.name}.character.json`,
      ],
      HostConfig: {
        Binds: [
          `${characterPath}:/app/characters/${config.name}.character.json`,
          `${agentDataPath}:/app/agent/data`,
        ],
        PortBindings: {
          '3000/tcp': [{ HostPort: port.toString() }],
        },
      },
      ExposedPorts: {
        '3000/tcp': {},
      },
    });

    const containerId = container.id;

    return { containerId, port };
  }

  private async waitForLog(containerId: string): Promise<string | null> {
    const container = this.docker.getContainer(containerId);
    const startTime = Date.now();
    const TIMEOUT = 5 * 60 * 1000;
    const POLL_INTERVAL = 15000;

    while (Date.now() - startTime < TIMEOUT) {
      try {
        const logs = await container.logs({
          stdout: true,
          stderr: true,
          tail: 1000,
        });
        const logsStr = logs.toString('utf8');

        if (logsStr.includes('Run `pnpm start:client` to start the client')) {
          console.log('✅ Container initialization detected');

          const lines = logsStr.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Initializing AgentRuntime with options')) {
              for (let j = i; j < i + 10 && j < lines.length; j++) {
                const uuidMatch = lines[j].match(/[0-9a-f-]{36}/);
                if (uuidMatch) {
                  console.log(
                    `✅ Container started and found Agent ID: ${uuidMatch[0]}`,
                  );
                  return uuidMatch[0];
                }
              }
            }
          }

          console.log('⚠️ Container started but Agent ID not found in logs:');
          return null;
        }

        console.log('⏳ Container running but waiting for initialization...');
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      } catch (error) {
        console.error(`❌ Error checking container: ${error.message}`);
        return null;
      }
    }

    console.error('❌ Timeout waiting for container');
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
    const name = containerInfo.Name.replace('/eliza-', '');

    // Remove container
    await container.remove({ force: true });

    // Clean up files
    try {
      await fs.rm(path.join(this.dataPath, name), { recursive: true });
      await fs.unlink(path.join(this.charactersPath, `${name}.character.json`));
    } catch (error) {
      console.error('Error cleaning up files:', error);
    }
  }
}
