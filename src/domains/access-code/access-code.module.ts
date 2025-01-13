import { Module } from '@nestjs/common';
import { AccessCodeTokens } from './interfaces';
import { AccessCodeGenerator } from './services/access-code-generator.service';
import { AccessCodeService } from './services/access-code.service';
import { AccessCodeMetricsService } from './services/access-code-metrics.service';
import { AccessCodeController } from './access-code.controller';

@Module({
  controllers: [AccessCodeController],
  providers: [
    {
      provide: AccessCodeTokens.Generator,
      useClass: AccessCodeGenerator,
    },
    {
      provide: AccessCodeTokens.Service,
      useClass: AccessCodeService,
    },
    {
      provide: AccessCodeTokens.Metrics,
      useClass: AccessCodeMetricsService,
    },
  ],
})
export class AccessCodeModule {}
