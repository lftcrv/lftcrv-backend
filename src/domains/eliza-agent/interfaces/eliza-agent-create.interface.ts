import { ElizaAgent, LatestMarketData } from '../entities/eliza-agent.entity';
import { CreateElizaAgentDto } from '../dtos/eliza-agent.dto';

export interface IElizaAgentCreateService {
  createAgent(dto: CreateElizaAgentDto): Promise<ElizaAgent>;
  updateMarketData(
    agentId: string,
    marketData: Partial<LatestMarketData>,
  ): Promise<ElizaAgent>;
}
