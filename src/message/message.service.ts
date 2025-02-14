import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../shared/prisma/prisma.service';
import { AgentStatus, ElizaAgent } from '@prisma/client';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async waitForAgent(
    runtimeAgentId: string,
    maxAttempts = 5,
    delayMs = 2000,
  ): Promise<ElizaAgent> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const agent = await this.prisma.elizaAgent.findFirst({
        where: {
          runtimeAgentId,
          status: AgentStatus.RUNNING,
          port: { not: null },
        },
      });

      if (agent && agent.port) {
        return agent;
      }

      this.logger.debug(
        `Agent not ready yet (attempt ${attempt}/${maxAttempts}), waiting ${delayMs}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(`Agent not ready after ${maxAttempts} attempts`);
  }

  async sendMessageToAgent(
    runtimeAgentId: string,
    message: { content: { text: string } },
  ) {
    const agent = await this.waitForAgent(runtimeAgentId);

    const url = `http://localhost:${agent.port}/${runtimeAgentId}/message`;
    const data = {
      text: message.content.text,
      userId: 'user1234',
      userName: 'dzk',
      roomId: 'room456',
      name: 'Basic Interaction',
      agentId: runtimeAgentId,
    };

    try {
      this.logger.debug(
        `Sending onboarding message to ${url} for agent ${agent.name} on port ${agent.port}`,
      );

      await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.logger.debug(
        `Onboarding message sent to agent ${agent.name} on port ${agent.port}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send onboarding message to agent ${agent.name} on port ${agent.port}: ${error.message}`,
      );
      throw error;
    }
  }
  
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
