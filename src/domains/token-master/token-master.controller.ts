import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
  Logger,
  BadRequestException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { TokenMasterService } from './services/token-master.service';
import {
  CreateTokenMasterDto,
  CreateBatchTokenMasterDto,
} from './dtos/create-token-master.dto';
import {
  UpdateTokenMasterDto,
  BatchUpdateTokenPriceDto,
} from './dtos/update-token-master.dto';
import { BatchUpdateTokenPriceBySymbolDto } from './dtos/batch-update-token-price-by-symbol.dto';
import { TokenMasterDto } from './dtos/token-master.dto';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { Response } from 'express';

@ApiTags('Token Master')
@Controller('api/token-master')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class TokenMasterController {
  private readonly logger = new Logger(TokenMasterController.name);

  constructor(private readonly tokenMasterService: TokenMasterService) {}

  @Post()
  @RequireApiKey()
  @ApiOperation({ summary: 'Create a new token master record' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Token master record created successfully.',
    type: TokenMasterDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input.',
  })
  async create(
    @Body() createDto: CreateTokenMasterDto,
  ): Promise<TokenMasterDto> {
    this.logger.log(`Attempting to create token: ${createDto.canonicalSymbol}`);
    return this.tokenMasterService.create(createDto);
  }

  @Post('batch')
  @RequireApiKey()
  @ApiOperation({ summary: 'Create multiple token master records in batch' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Batch token master records creation processed.',
    schema: { properties: { count: { type: 'number' } } },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input.',
  })
  async createBatch(
    @Body() batchCreateDto: CreateBatchTokenMasterDto,
  ): Promise<{ count: number }> {
    this.logger.log(
      `Attempting to create batch of ${batchCreateDto.tokens.length} tokens.`,
    );
    return this.tokenMasterService.createBatch(batchCreateDto);
  }

  @Get()
  @RequireApiKey()
  @ApiOperation({ summary: 'Get all token master records' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of token master records.',
    type: [TokenMasterDto],
    headers: {
      'X-Total-Count': {
        description: 'Total number of token master records.',
        schema: { type: 'integer' },
      },
    },
  })
  async findAll(
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenMasterDto[]> {
    this.logger.log('Fetching all token master records.');
    const { tokens, count } = await this.tokenMasterService.findAll();
    res.header('X-Total-Count', count.toString());
    return tokens;
  }

  @Get('prices')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get all token symbols and their USD prices' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of token symbols and their USD prices.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          canonicalSymbol: { type: 'string' },
          priceUSD: { type: 'number', nullable: true },
        },
      },
    },
  })
  async findAllPrices(): Promise<
    { canonicalSymbol: string; priceUSD: number | null }[]
  > {
    this.logger.log('Fetching all token prices with symbols.');
    return this.tokenMasterService.findAllPrices();
  }

  @Get('prices/by-symbols/:symbols')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get prices for a list of token symbols' })
  @ApiParam({
    name: 'symbols',
    type: 'string',
    description:
      'Comma-separated list of canonical token symbols (e.g., BTC,ETH,SOL)',
    example: 'BTC,ETH,SOL',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of requested token symbols and their USD prices.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          canonicalSymbol: { type: 'string' },
          priceUSD: { type: 'number', nullable: true },
        },
      },
    },
  })
  async findPricesBySymbols(
    @Param('symbols') symbolsParam: string,
  ): Promise<{ canonicalSymbol: string; priceUSD: number | null }[]> {
    this.logger.log(`Fetching prices for symbols: ${symbolsParam}`);

    const symbolsArray = symbolsParam
      .split(',')
      .map((symbol) => symbol.trim().toUpperCase());

    if (symbolsArray.includes('') || symbolsArray.length === 0) {
      throw new BadRequestException(
        'Symbols parameter cannot be empty and must be a comma-separated list of valid symbols.',
      );
    }

    return this.tokenMasterService.findPricesBySymbols(symbolsArray);
  }

  @Get(':id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a token master record by its UUID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token master record found.',
    type: TokenMasterDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Token master record not found.',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TokenMasterDto> {
    this.logger.log(`Fetching token master record with ID: ${id}`);
    return this.tokenMasterService.findOne(id);
  }

  @Get('lookup/by-contract')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a token by contract address and chain ID' })
  @ApiQuery({ name: 'contractAddress', type: 'string', required: true })
  @ApiQuery({ name: 'chainID', type: 'string', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token found.',
    type: TokenMasterDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Token not found.',
  })
  async findByContractAndChain(
    @Query('contractAddress') contractAddress: string,
    @Query('chainID') chainID: string,
  ): Promise<TokenMasterDto> {
    this.logger.log(
      `Looking up token by contract ${contractAddress} on chain ${chainID}`,
    );
    return this.tokenMasterService.findByContractAndChain(
      contractAddress,
      chainID,
    );
  }

  @Put(':id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Update a token master record' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token master record updated successfully.',
    type: TokenMasterDto,
    headers: {
      'X-Updated-Count': {
        description: 'Number of records updated (always 1 for this endpoint).',
        schema: { type: 'integer', enum: [1] },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Token master record not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTokenMasterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<TokenMasterDto> {
    this.logger.log(`Attempting to update token master record with ID: ${id}`);
    const updatedToken = await this.tokenMasterService.update(id, updateDto);
    res.header('X-Updated-Count', '1');
    return updatedToken;
  }

  @Put('prices/batch')
  @RequireApiKey()
  @ApiOperation({ summary: 'Update prices for multiple tokens in batch' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch token price update processed.',
    schema: { properties: { count: { type: 'number' } } },
    headers: {
      'X-Updated-Count': {
        description: 'Number of records updated in the batch.',
        schema: { type: 'integer' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input.',
  })
  async updatePricesBatch(
    @Body() batchUpdatePriceDto: BatchUpdateTokenPriceDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ count: number }> {
    this.logger.log(
      `Attempting to update batch of ${batchUpdatePriceDto.updates.length} token prices.`,
    );
    const result =
      await this.tokenMasterService.updatePricesBatch(batchUpdatePriceDto);
    res.header('X-Updated-Count', result.count.toString());
    return result;
  }

  @Put('prices/batch-by-id')
  @RequireApiKey()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch update prices for multiple tokens by their UUIDs',
  })
  @ApiBody({ type: BatchUpdateTokenPriceDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch token prices updated successfully by ID.',
    schema: { properties: { count: { type: 'number' } } },
    headers: {
      'X-Updated-Count': {
        description: 'Total number of token prices updated.',
        schema: { type: 'integer' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or no valid operations to perform.',
  })
  async updatePricesBatchById(
    @Body() batchUpdatePriceDto: BatchUpdateTokenPriceDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ count: number }> {
    this.logger.log(
      `Attempting to batch update prices for ${batchUpdatePriceDto.updates.length} tokens by ID.`,
    );
    const result =
      await this.tokenMasterService.updatePricesBatch(batchUpdatePriceDto);
    res.header('X-Updated-Count', result.count.toString());
    return result;
  }

  @Put('prices/batch-by-symbol')
  @RequireApiKey()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch update prices for multiple tokens by their symbols',
  })
  @ApiBody({ type: BatchUpdateTokenPriceBySymbolDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch token prices updated successfully by symbol.',
    schema: {
      properties: {
        count: { type: 'number' },
        notFound: { type: 'array', items: { type: 'string' } },
      },
    },
    headers: {
      'X-Updated-Count': {
        description: 'Total number of token prices updated.',
        schema: { type: 'integer' },
      },
      'X-Not-Found-Symbols': {
        description:
          'Comma-separated list of symbols not found or not updated.',
        schema: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'None of the provided token symbols were found.',
  })
  async updatePricesBatchBySymbol(
    @Body() batchUpdateDto: BatchUpdateTokenPriceBySymbolDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ count: number; notFound: string[] }> {
    this.logger.log(
      `Attempting to batch update prices for ${batchUpdateDto.updates.length} tokens by symbol.`,
    );
    const result =
      await this.tokenMasterService.batchUpdatePricesBySymbol(batchUpdateDto);
    res.header('X-Updated-Count', result.count.toString());
    if (result.notFound.length > 0) {
      res.header('X-Not-Found-Symbols', result.notFound.join(','));
    }
    return result;
  }

  @Delete(':id')
  @RequireApiKey()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a token master record by its UUID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Token master record deleted successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Token master record not found.',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Attempting to delete token master record with ID: ${id}`);
    await this.tokenMasterService.remove(id);
  }

  @Post('delete/batch') // Using POST for batch delete to allow request body for IDs
  @RequireApiKey()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple token master records in batch' })
  @ApiBody({
    schema: {
      properties: {
        ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch token master records deletion processed.',
    schema: { properties: { count: { type: 'number' } } },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input.',
  })
  async removeBatch(@Body('ids') ids: string[]): Promise<{ count: number }> {
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new BadRequestException('Input must be an array of string IDs.');
    }
    this.logger.log(`Attempting to delete batch of ${ids.length} tokens.`);
    return this.tokenMasterService.removeBatch(ids);
  }
}
