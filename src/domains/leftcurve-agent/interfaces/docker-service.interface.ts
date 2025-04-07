export interface CreateContainerConfig {
  name: string;
  agentConfig: Record<string, any>;
  starknetAddress: string;
  starknetPrivateKey: string;
  ethereumPrivateKey: string;
  ethereumAccountAddress: string;
}

export interface ContainerResult {
  containerId: string;
  port: number;
}

export interface IDockerService {
  createContainer(config: CreateContainerConfig): Promise<ContainerResult>;
  startContainer(containerId: string): Promise<void>;
  stopContainer(containerId: string): Promise<void>;
  removeContainer(containerId: string): Promise<void>;
  getRuntimeAgentId(containerId: string): Promise<string | null>;
}
