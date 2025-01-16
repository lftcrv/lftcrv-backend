import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthCheckToken } from './health.interface';
import { HealthCheckService } from './health.service';

@Module({
  imports: [TerminusModule, ConfigModule, PrismaModule],
  controllers: [HealthController],
  providers: [
    {
      provide: HealthCheckToken,
      useClass: HealthCheckService,
    },
  ],
  exports: [HealthCheckToken],
})
export class HealthModule {}
