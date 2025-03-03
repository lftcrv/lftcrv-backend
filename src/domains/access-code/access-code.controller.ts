import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Headers,
  UseInterceptors,
  Inject,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import {
  AccessCodeTokens,
  IAccessCodeMetricsService,
  IAccessCodeService,
} from './interfaces';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import {
  GenerateAccessCodesDto,
  VerifyAccessCodeDto,
  GenerateAccessCodeDto,
  ValidateAccessCodeDto,
  AccessCodeIdDto,
} from './dtos/access-code.dto';

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

  // New endpoints for the gated access system
  @Post('access-codes/generate')
  @RequireApiKey()
  @ApiOperation({ summary: 'Generate a new access code' })
  @ApiResponse({
    status: 201,
    description: 'Access code generated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async generateAccessCode(@Body() dto: GenerateAccessCodeDto) {
    const accessCode = await this.accessCodeService.generateAccessCode(dto);

    return {
      status: 'success',
      data: { accessCode },
    };
  }

  @Post('access-codes/validate')
  // @RateLimit({ windowMs: 15 * 60 * 1000, max: 5 }) // Uncomment when rate limit interceptor is available
  @ApiOperation({ summary: 'Validate an access code' })
  @ApiResponse({
    status: 200,
    description: 'Access code validated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid code' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async validateAccessCode(@Body() dto: ValidateAccessCodeDto) {
    const result = await this.accessCodeService.validateAccessCode(
      dto.code,
      dto.userId,
    );

    return {
      status: 'success',
      data: { result },
    };
  }

  @Get('access-codes/status/:id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get access code status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Access code not found' })
  async getAccessCodeStatus(@Param() params: AccessCodeIdDto) {
    const status = await this.accessCodeService.getAccessCodeStatus(params.id);

    return {
      status: 'success',
      data: { status },
    };
  }

  @Put('access-codes/disable/:id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Disable an access code' })
  @ApiResponse({
    status: 200,
    description: 'Access code disabled successfully',
  })
  @ApiResponse({ status: 404, description: 'Access code not found' })
  async disableAccessCode(@Param() params: AccessCodeIdDto) {
    const result = await this.accessCodeService.disableAccessCode(params.id);

    return {
      status: 'success',
      data: { disabled: result },
    };
  }

  @Get('access-codes/stats')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get access code statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getAccessCodeStats() {
    const stats = await this.accessCodeService.getAccessCodeStats();

    return {
      status: 'success',
      data: { stats },
    };
  }
}
