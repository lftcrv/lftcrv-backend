import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { PrismaService } from '../../shared/prisma/prisma.service';

@ApiTags('Orchestrations')
@Controller('api/orchestrations')
@UseInterceptors(LoggingInterceptor)
export class OrchestrationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequireApiKey()
  @ApiOperation({ summary: 'Get all orchestrations' })
  @ApiResponse({ status: 200, description: 'Return all orchestrations' })
  async getAllOrchestrations() {
    const orchestrations = await this.prisma.orchestration.findMany();
    return { status: 'success', data: { orchestrations } };
  }

  @Get(':id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get an orchestration by id' })
  @ApiResponse({ status: 200, description: 'Return the orchestration' })
  async getOrchestration(@Param('id') id: string) {
    const orchestration = await this.prisma.orchestration.findUnique({
      where: { id },
    });
    if (!orchestration) {
      return { status: 'error', message: 'Orchestration not found' };
    }
    return { status: 'success', data: { orchestration } };
  }
}