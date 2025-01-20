import { ElizaAgent } from '../entities/eliza-agent.entity';

export interface IElizaAgentQueryService {
  getAgent(id: string): Promise<ElizaAgent>;
  listAgents(): Promise<ElizaAgent[]>;
  listRunningAgents(): Promise<ElizaAgent[]>;
  listLatestAgents(): Promise<ElizaAgent[]>;
  searchAgents(searchTerm: string): Promise<ElizaAgent[]>;
}
