import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { HealthCheckToken, IHealthCheckService } from './health.interface';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(
    @Inject(HealthCheckToken)
    private readonly healthService: IHealthCheckService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Check API health status' })
  check() {
    return this.healthService.check();
  }
}
