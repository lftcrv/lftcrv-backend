import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../shared/prisma/prisma.service';
import { AgentStatus, ElizaAgent } from '@prisma/client';
import { Cron } from '@nestjs/schedule';

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

    const apiKey = process.env.SERVER_API_KEY || 'secret-key';
    const url = `http://localhost:${agent.port}/api/key/request`;

    try {
      this.logger.debug(
        `Sending message to ${url} for agent ${agent.name} on port ${agent.port}`,
      );

      await axios.post(
        url,
        { request: message.content.text },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
        },
      );

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
          {
            content: {
              text: 'Analyze current market conditions on Avnu and execute the optimal token swap strategy. Make trading decisions that align with your personality, bio, lore, and knowledge. Provide clear explanations for all swap decisions that reflect your unique perspective and character traits.',
            },
          },
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

  /**
   * Sends the market analysis request followed by portfolio allocation request to an agent
   * @param runtimeAgentId The runtime ID of the agent
   * @param delayBetweenRequests Delay in milliseconds between the two requests
   */
  async sendTradeAndPortfolioRequests(
    runtimeAgentId: string,
    delayBetweenRequests = 20000, // 20 seconds default delay
  ) {
    try {
      this.logger.log(
        `Sending market analysis and portfolio requests to agent with runtime ID: ${runtimeAgentId}`,
      );

      // First request: market analysis and trade decision
      const tradeDecisionRequest = {
        content: {
          text: "Examine the current Paradex markets and decide whether to make a trade based on YOUR unique trading philosophy and character traits First, use get_analysis_paradex to review the latest technical indicators. Then, carefully consider: 1) Do the current market conditions truly align with your personal trading style and risk tolerance? 2) Would trading now reflect your character's distinct approach to markets?Remember that NOT trading is often the most prudent decision. There's no pressure to execute a trade - only do so if it genuinely makes sense for your specific character. If you decide to trade, use simulate_trade and focus your explanation on how this specific opportunity matches your unique perspective. Mention only the 1-2 most relevant technical factors without listing every indicator. If you decided to trade, use print_portfolio and send_portfolio_balance to track your position. The most important thing is that your decision authentically reflects your character - don't trade unless it truly fits your personality and trading philosophy.",
        },
      };

      // Send first request
      await this.sendMessageToAgent(runtimeAgentId, tradeDecisionRequest);
      
      this.logger.log(
        `Trade decision request sent successfully. Waiting ${
          delayBetweenRequests / 1000
        } seconds before sending portfolio allocation request...`,
      );

      // Wait before sending the second request
      await new Promise((resolve) => setTimeout(resolve, delayBetweenRequests));

      // Second request: portfolio allocation
      const portfolioAllocationRequest = {
        content: {
          text: "Review the available analysis and tradable cryptos. Then, based on current market conditions and the five cryptos assigned to you (plus USDC), define your portfolio allocation strategy accordingly.",
        },
      };

      // Send second request
      await this.sendMessageToAgent(runtimeAgentId, portfolioAllocationRequest);
      
      this.logger.log(
        `Portfolio allocation request sent successfully to agent with runtime ID: ${runtimeAgentId}`,
      );

      return { 
        success: true, 
        message: 'Both requests sent successfully' 
      };
    } catch (error) {
      this.logger.error(
        `Failed to send requests to agent with runtime ID ${runtimeAgentId}: ${error.message}`,
      );
      throw error;
    }
  }

  // S'exécute 5 minutes après chaque tâche de simulation de trading
  @Cron('3-59/8 * * * *')  // 5 minutes après l'heure paire
  async sendPortfolioBalanceUpdate() {
    const startTime = Date.now();
    this.logger.log('Sending portfolio balance update request to active agents');
    try {
      const runningAgents: ElizaAgent[] = await this.prisma.elizaAgent.findMany({
        where: {
          status: AgentStatus.RUNNING,
          runtimeAgentId: { not: null },
          port: { not: null },
        },
      });

      this.logger.debug(`Found ${runningAgents.length} running agents for portfolio update`);
      if (runningAgents.length === 0) {
        this.logger.warn('⚠️ No active agent found for portfolio update.');
        return;
      }

      for (const agent of runningAgents) {
        await this.sendMessageToAgent(agent.runtimeAgentId, {
          content: {
            text: 'execute send_portfolio_balance',
          },
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Successfully sent portfolio balance update requests to active agents (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Failed to send portfolio balance update requests to active agents (${duration}ms): ${error.message}`,
      );
    }
  }
}
