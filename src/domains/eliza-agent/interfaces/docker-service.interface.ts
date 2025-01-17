export interface IDockerService {
  createContainer(config: Record<string, any>): Promise<{ containerId: string; port: number }>;
  startContainer(containerId: string): Promise<void>;
  stopContainer(containerId: string): Promise<void>;
  removeContainer(containerId: string): Promise<void>;
  getRuntimeAgentId(containerId: string): Promise<string | null>;
}