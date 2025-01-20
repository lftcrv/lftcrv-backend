export interface IElizaAgentLifecycleService {
  stopAgent(id: string): Promise<void>;
  startAgent(id: string): Promise<void>;
}
