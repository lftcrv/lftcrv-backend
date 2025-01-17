import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { AgentStatus, ElizaAgent } from '@prisma/client';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(private readonly prisma: PrismaService) {} 

  async sendMessagesToRunningAgents() {
    try {
      const runningAgents: ElizaAgent[] = await this.prisma.elizaAgent.findMany({
        where: { status: AgentStatus.RUNNING },
      });

      if (runningAgents.length === 0) {
        this.logger.warn('⚠️ No active agent found.');
        return;
      }

      for (const agent of runningAgents) {
        await this.sendMessage(agent.id);
      }
    } catch (error) {
      this.logger.error(`❌ Error : ${error.message}`);
    }
  }


  public async sendMessage(agentId: string) {
    const url = `http://localhost:3000/${agentId}/message`;
    const data = {
      text: 'trade',
      userId: 'user1234',
      userName: `dzk`,
      roomId: 'room456',
      name: 'Basic Interaction',
    };

    try {
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      this.logger.log(`✅ Message sent to the agent ${agentId} : ${JSON.stringify(response.data)}`);
    } catch (error) {
      this.logger.error(`❌ Error while sending to agent ${agentId} : ${error.message}`);
    }
  }
}
