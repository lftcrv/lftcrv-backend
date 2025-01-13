import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UseInterceptors,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { LoggingInterceptor } from 'src/shared/interceptors/logging.interceptor';
import {
  AccessCodeTokens,
  IAccessCodeMetricsService,
  IAccessCodeService,
} from './interfaces';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';

class GenerateAccessCodesDto {
  @ApiProperty({
    description: 'Number of codes to generate',
    minimum: 1,
    maximum: 100,
    example: 5,
  })
  count: number;
}

class VerifyAccessCodeDto {
  @ApiProperty({
    description: 'The 6-character access code to verify',
    minLength: 6,
    maxLength: 6,
    example: '2A4B6C',
  })
  code: string;
}

@ApiTags('Access Codes')
@Controller('api/access-code')
@UseInterceptors(LoggingInterceptor)
export class AccessCodeController {
  constructor(
    @Inject(AccessCodeTokens.Service)
    private readonly accessCodeService: IAccessCodeService,
    @Inject(AccessCodeTokens.Metrics)
    private readonly metricsService: IAccessCodeMetricsService,
  ) {}

  @Post('generate')
  @RequireApiKey()
  @ApiOperation({ summary: 'Generate new access codes' })
  @ApiResponse({ status: 201, description: 'Codes generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid count provided' })
  async generateCodes(@Body() dto: GenerateAccessCodesDto) {
    if (!dto.count || dto.count < 1 || dto.count > 100) {
      throw new BadRequestException('Count must be between 1 and 100');
    }

    const codes = await this.accessCodeService.generateCodes(dto.count);

    return {
      status: 'success',
      data: { codes },
    };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify an access code' })
  @ApiResponse({ status: 200, description: 'Code verified successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid code or code already used',
  })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async verifyCode(
    @Body() dto: VerifyAccessCodeDto,
    @Headers('x-forwarded-for') clientIp: string = 'unknown',
  ) {
    const result = await this.accessCodeService.verifyCode(dto.code, clientIp);

    return {
      status: 'success',
      ...result,
    };
  }

  @Get('metrics')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get access code metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics() {
    const metrics = await this.metricsService.getMetrics();

    return {
      status: 'success',
      data: { metrics },
    };
  }
}
