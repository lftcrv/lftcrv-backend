import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../shared/prisma/prisma.service';
import { AgentStatus, ElizaAgent } from '@prisma/client';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendMessagesToRunningAgents() {
    try {
      this.logger.debug('Fetching running agents...');
      const runningAgents: ElizaAgent[] = await this.prisma.elizaAgent.findMany(
        {
          where: {
            status: AgentStatus.RUNNING,
            runtimeAgentId: { not: null },
            port: { not: null },
          },
        },
      );

      this.logger.debug(`Found ${runningAgents.length} running agents`);
      if (runningAgents.length === 0) {
        this.logger.warn('⚠️ No active agent found.');
        return;
      }

      for (const agent of runningAgents) {
        if (agent.runtimeAgentId && agent.port) {
          this.sendMessage(agent).catch((err) => {
            this.logger.error(
              `Failed to send message to ${agent.name}: ${err.message}`,
            );
          });
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error : ${error.message}`);
    }
  }

  private async sendMessage(agent: ElizaAgent) {
    const url = `http://localhost:${agent.port}/${agent.runtimeAgentId}/message`;

    const data = {
      text: 'execute SIMULATE_STARKNET_TRADE',
      userId: 'user1234',
      userName: 'dzk',
      roomId: 'room456',
      name: 'Basic Interaction',
      agentId: agent.runtimeAgentId,
    };

    try {
      this.logger.debug(
        `Sending message to ${url} for agent ${agent.name} on port ${agent.port}`,
      );

      axios
        .post(url, data, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        .catch(() => {
          // Ignorer les erreurs silencieusement
        });

      this.logger.debug(
        `Message sent to agent ${agent.name} on port ${agent.port}`,
      );
    } catch (error) {
      this.logger.debug(
        `Error sending to agent ${agent.name} on port ${agent.port}: ${error.message}`,
      );
    }
  }
}
