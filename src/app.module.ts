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
import { ElizaAgentModule } from './domains/eliza-agent/eliza-agent.module';

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
    AccessCodeModule,
    ElizaAgentModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
