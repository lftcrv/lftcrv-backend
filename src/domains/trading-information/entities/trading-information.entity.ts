import { JsonValue } from '@prisma/client/runtime/library';

export class TradingInformation {
  id: string;
  createdAt: Date;
  elizaAgentId: string;
  information: JsonValue;
}
