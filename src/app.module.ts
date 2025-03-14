import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { AuthModule } from './shared/auth/auth.module';
import {
  environmentConfig,
  validationSchema,
} from './shared/config/env.config';
import { AccessCodeModule } from './domains/access-code/access-code.module';
import { HealthModule } from './shared/health/health.module';
import { ElizaAgentModule } from './domains/leftcurve-agent/leftcurve-agent.module';
import { TasksModule } from './cron/tasks.module';
import { MessageModule } from './message/message.module';
import { TradingInformationModule } from './domains/trading-information/trading-information.module';
import { LeaderboardModule } from './domains/leaderboard/leaderboard.module';
import { StarknetModule } from './domains/blockchain/starknet/starknet.module';
import { AgentTokenModule } from './domains/agent-token/agent-token.module';
import { BlockchainModule } from './shared/blockchain/blockchain.module';
import { TransactionModule } from './domains/transaction/transaction.module';
import { TechnicalModule } from './domains/analysis/technical/technical.module';
import { AnalysisModule } from './domains/analysis/analysis.module';
import { AnalysisSharedModule } from './domains/analysis/shared/shared.module';
import { OrchestrationModule } from './domains/orchestration/orchestration.module';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { UserModule } from './domains/user/user.module';
import { KPIModule } from './domains/kpi/kpi.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [environmentConfig],
      validate: (config: Record<string, unknown>) => {
        const missingVars: string[] = [];

        Object.entries(validationSchema).forEach(([key, validation]) => {
          if (validation.required && !config[key]) {
            missingVars.push(`${key}: ${validation.message}`);
          }
        });

        if (missingVars.length > 0) {
          throw new Error(
            'Missing required environment variables:\n' +
              missingVars.join('\n'),
          );
        }

        return config;
      },
    }),
    {
      module: AuthModule,
      global: true,
    },
    PrismaModule,
    BlockchainModule,
    AccessCodeModule,
    HealthModule,
    ElizaAgentModule,
    TradingInformationModule,
    KPIModule,
    TasksModule,
    MessageModule,
    LeaderboardModule,
    StarknetModule,
    AgentTokenModule,
    TransactionModule,
    AnalysisSharedModule,
    TechnicalModule,
    AnalysisModule,
    OrchestrationModule,
    UserModule,
    ScheduleModule.forRoot(),
    TerminusModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
