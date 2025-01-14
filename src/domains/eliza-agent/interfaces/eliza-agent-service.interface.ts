import { ElizaAgent } from '../entities/eliza-agent.entity';
import { CreateElizaAgentDto } from '../dtos/eliza-agent.dto';

export interface IElizaAgentService {
    createAgent(dto: CreateElizaAgentDto): Promise<ElizaAgent>;
    getAgent(id: string): Promise<ElizaAgent>;
    listAgents(): Promise<ElizaAgent[]>;
    stopAgent(id: string): Promise<void>;
    startAgent(id: string): Promise<void>;
}
