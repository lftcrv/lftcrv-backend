import { Module } from '@nestjs/common';
import { AgentTokenTokens } from './interfaces';
import { CreateAgentTokenService } from './services/create-agent-token.service';
import { QueryAgentTokenService } from './services/query-agent-token.service';
import { AgentTokenController } from './agent-token.controller';

@Module({
  controllers: [AgentTokenController],
  providers: [
    {
      provide: AgentTokenTokens.CreateAgentToken,
      useClass: CreateAgentTokenService,
    },
    {
      provide: AgentTokenTokens.QueryAgentToken,
      useClass: QueryAgentTokenService,
    },
  ],
  exports: [AgentTokenTokens.CreateAgentToken],
})
export class AgentTokenModule {}
