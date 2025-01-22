import { Module } from '@nestjs/common';
import { AgentTokenTokens } from './interfaces';
import { CreateAgentTokenService } from './services/create-agent-token.service';

@Module({
  providers: [
    {
      provide: AgentTokenTokens.CreateAgentToken,
      useClass: CreateAgentTokenService,
    },
  ],
  exports: [AgentTokenTokens.CreateAgentToken],
})
export class AgentTokenModule {}
