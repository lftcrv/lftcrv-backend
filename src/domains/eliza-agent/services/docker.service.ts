import { Injectable } from '@nestjs/common';
import { IDockerService } from '../interfaces/docker-service.interface';
import * as Docker from 'dockerode';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class DockerService implements IDockerService {
    private docker: Docker;
    private readonly elizaPath: string;

    constructor() {
        this.docker = new Docker();
        this.elizaPath = process.env.ELIZA_PATH || '/opt/eliza';
    }

    async createContainer(config: Record<string, any>): Promise<string> {
        // Écrire le fichier character.json
        const characterPath = path.join(this.elizaPath, 'characters', `${config.name}.character.json`);
        await fs.writeFile(characterPath, JSON.stringify(config.characterConfig, null, 2));

        const container = await this.docker.createContainer({
            Image: 'eliza:latest',
            name: `eliza-${config.name}`,
            Env: [
                `DISCORD_APPLICATION_ID=${process.env.DISCORD_APPLICATION_ID}`,
                `DISCORD_API_TOKEN=${process.env.DISCORD_API_TOKEN}`,
                `HEURIST_API_KEY=${process.env.HEURIST_API_KEY}`,
                `OPENAI_API_KEY=${process.env.OPENAI_API_KEY}`
            ],
            Cmd: ['pnpm', 'start', `--character=characters/${config.name}.character.json`],
            HostConfig: {
                Binds: [`${characterPath}:/app/characters/${config.name}.character.json`]
            }
        });

        return container.id;
    }

    async startContainer(containerId: string): Promise<void> {
        const container = this.docker.getContainer(containerId);
        await container.start();
    }

    async stopContainer(containerId: string): Promise<void> {
        const container = this.docker.getContainer(containerId);
        await container.stop();
    }

    async removeContainer(containerId: string): Promise<void> {
        const container = this.docker.getContainer(containerId);
        await container.remove({ force: true });
    }
}