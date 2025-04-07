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
      id: 'create-container',
      name: 'Create Docker Container',
      order: 2,
      description: 'Creating Docker container for the agent',
    },
    {
      id: 'start-container',
      name: 'Start Container',
      order: 3,
      description: 'Starting the Docker container and getting runtime ID',
    },
  ],
};
