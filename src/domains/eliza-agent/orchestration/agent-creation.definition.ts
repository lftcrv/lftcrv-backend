import { OrchestrationDefinition } from '../../../domains/orchestration/interfaces';

export const AGENT_CREATION_DEFINITION: OrchestrationDefinition = {
  type: 'agent-creation',
  steps: [
    {
      id: 'create-db-record',
      name: 'Create Database Record',
      order: 1,
      description: 'Creating initial database record for the agent',
    },
    {
      id: 'create-wallet',
      name: 'Create Starknet Wallet',
      order: 2,
      description: 'Creating a new Starknet wallet for the agent',
    },
    {
      id: 'fund-wallet',
      name: 'Fund Wallet',
      order: 3,
      description: 'Funding the wallet with initial ETH',
    },
    {
      id: 'deploy-wallet',
      name: 'Deploy Wallet',
      order: 4,
      description: 'Deploying the wallet contract on Starknet',
    },
    {
      id: 'deploy-agent-token',
      name: 'Deploy Agent Token',
      order: 5,
      description: 'Deploying the agent token contract on Starknet',
    },
    {
      id: 'create-container',
      name: 'Create Docker Container',
      order: 6,
      description: 'Creating Docker container for the agent',
    },
    {
      id: 'start-container',
      name: 'Start Container',
      order: 7,
      description: 'Starting the Docker container and getting runtime ID',
    },
  ],
};
