import { JsonValue } from '@prisma/client/runtime/library';

export class TradingInformation {
  id: string;
  createdAt: string | Date;
  elizaAgentId: string;
  information: JsonValue;
}
