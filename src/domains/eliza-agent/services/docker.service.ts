import { Injectable, OnModuleInit } from '@nestjs/common';
import { IDockerService } from '../interfaces/docker-service.interface';
import * as Docker from 'dockerode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AgentStatus } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';

@Injectable()
export class DockerService implements IDockerService, OnModuleInit {
  private docker: Docker;
  private readonly elizaBasePath: string;
  private readonly elizaEnvPath: string;
  private readonly dataPath: string;
  private readonly charactersPath: string;
  private readonly startPort = 3001;
  private readonly maxPort = 3999;

  constructor(private readonly prisma: PrismaService) {
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
        status: { not: AgentStatus.STOPPED }
      },
      select: { port: true }
    });

    const usedPortSet = new Set(usedPorts.map(a => a.port));

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
  async createContainer(config: Record<string, any>): Promise<{ containerId: string; port: number }> {
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

    const container = await this.docker.createContainer({
      Image: 'julienbrs/eliza:latest',
      name: `eliza-${config.name}`,
      Env: ['SERVER_PORT=3000'],
      Cmd: [
        'pnpm',
        'start',
        `--character=characters/${config.name}.character.json`,
      ],
      HostConfig: {
        Binds: [
          `${this.elizaEnvPath}:/app/.env:ro`,
          `${characterPath}:/app/characters/${config.name}.character.json`,
          `${agentDataPath}:/app/agent/data`,
        ],
        PortBindings: {
          '3000/tcp': [{ HostPort: port.toString() }]
        }
      },
      ExposedPorts: {
        '3000/tcp': {}
      }
    });

    return { containerId: container.id, port };
  }

  private async waitForLog(containerId: string, timeoutMs = 300000, intervalMs = 5000): Promise<string | null> {
    const startTime = Date.now();
    const container = this.docker.getContainer(containerId);
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Get logs since container start
        const logs = await container.logs({
          stdout: true,
          stderr: true,
          timestamps: true,
          since: Math.floor(startTime / 1000)
        });

        const logsStr = logs.toString('utf8');
        const match = logsStr.match(/Agent ID[^\n]*\n[^\n]*([a-f0-9-]{36})/);
        
        if (match && match[1]) {
          return match[1];
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      } catch (error) {
        console.error('Error reading container logs:', error);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }

    console.warn(`Timeout reached while waiting for Agent ID in container ${containerId}`);
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
