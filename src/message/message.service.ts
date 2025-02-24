import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../shared/prisma/prisma.service';
import { AgentStatus, ElizaAgent } from '@prisma/client';

interface MessagePayload {
  text: string;
  userId?: string;
  userName?: string;
  roomId?: string;
  name?: string;
  agentId: string;
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);
  private readonly defaultMessageParams = {
    userId: 'defaultUser',
    userName: 'default',
    roomId: 'room123',
    name: 'Basic Interaction',
  };

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

  private createMessagePayload(text: string, agentId: string): MessagePayload {
    return {
      text,
      agentId,
      ...this.defaultMessageParams,
    };
  }

  async sendMessageToAgent(
    runtimeAgentId: string,
    message: { content: { text: string } },
    waitForReady = true,
  ) {
    const agent = waitForReady
      ? await this.waitForAgent(runtimeAgentId)
      : await this.prisma.elizaAgent.findFirst({
          where: {
            runtimeAgentId,
            status: AgentStatus.RUNNING,
            port: { not: null },
          },
        });

    if (!agent || !agent.port) {
      throw new Error(`Agent not found or not ready: ${runtimeAgentId}`);
    }

    const url = `http://localhost:${agent.port}/${runtimeAgentId}/message`;
    const data = this.createMessagePayload(
      message.content.text,
      runtimeAgentId,
    );

    try {
      this.logger.debug(
        `Sending message to ${url} for agent ${agent.name} on port ${agent.port}`,
      );

      await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.logger.debug(
        `Message sent to agent ${agent.name} on port ${agent.port}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send message to agent ${agent.name} on port ${agent.port}: ${error.message}`,
      );
      throw error;
    }
  }

  async sendStarknetMessageToRunningAgents() {
    try {
      this.logger.debug('Fetching running agents...');
      const runningAgents = await this.prisma.elizaAgent.findMany({
        where: {
          status: AgentStatus.RUNNING,
          runtimeAgentId: { not: null },
          port: { not: null },
        },
      });

      this.logger.debug(`Found ${runningAgents.length} running agents`);
      if (runningAgents.length === 0) {
        this.logger.warn('⚠️ No active agent found.');
        return;
      }

      const promises = runningAgents.map((agent) =>
        this.sendMessageToAgent(
          agent.runtimeAgentId,
          { content: { text: 'EXECUTE SIMULATE_STARKNET_TRADE' } },
          false, // Don't wait for ready since we already know they're running
        ).catch((err) => {
          this.logger.error(
            `Failed to send message to ${agent.name}: ${err.message}`,
          );
        }),
      );

      await Promise.all(promises);
    } catch (error) {
      this.logger.error(`❌ Error : ${error.message}`);
      throw error;
    }
  }
}
