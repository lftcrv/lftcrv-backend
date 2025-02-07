import { Module } from '@nestjs/common';
import { AgentTokenTokens } from './interfaces';
import { CreateAgentTokenService } from './services/create-agent-token.service';
import { QueryAgentTokenService } from './services/query-agent-token.service';
import { AgentTokenController } from './agent-token.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { BlockchainModule } from '../../shared/blockchain/blockchain.module';

@Module({
  controllers: [AgentTokenController],
  imports: [PrismaModule, BlockchainModule],
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
  exports: [
    AgentTokenTokens.QueryAgentToken,
    AgentTokenTokens.CreateAgentToken,
  ],
})
export class AgentTokenModule {}
