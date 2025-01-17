import { AgentStatus, CurveSide } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';

export class ElizaAgent {
  id: string;
  name: string;
  curveSide: CurveSide;
  status: AgentStatus;
  containerId?: string;
  characterConfig: JsonValue;
  createdAt: Date;
  updatedAt: Date;
}
