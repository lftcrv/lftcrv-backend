import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionTokens, ITransactionService } from './interfaces';
import { LoggingInterceptor } from 'src/shared/interceptors/logging.interceptor';
import { RequireApiKey } from 'src/shared/auth/decorators/require-api-key.decorator';
import { TransactionDto } from './dto/transaction.dto';
import { TransactionQueryParams } from './interfaces/transaction.interface';

@ApiTags('Transactions')
@Controller('api/transactions')
@UseInterceptors(LoggingInterceptor)
export class TransactionController {
  constructor(
    @Inject(TransactionTokens.Service)
    private readonly transactionService: ITransactionService,
  ) {}

  @Post()
  @RequireApiKey()
  @ApiOperation({ summary: 'Create a new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async create(@Body() createTransactionDto: TransactionDto) {
    const transaction =
      await this.transactionService.create(createTransactionDto);
    return {
      status: 'success',
      data: { transaction },
    };
  }

  @Get()
  @RequireApiKey()
  @ApiOperation({ summary: 'Get all transactions with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async findAll(@Query() query: TransactionQueryParams) {
    const transactions = await this.transactionService.findAll(query);
    return {
      status: 'success',
      data: transactions,
    };
  }

  @Get(':id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a transaction by ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction retrieved successfully',
  })
  async findOne(@Param('id') id: string) {
    const transaction = await this.transactionService.findOne(id);
    return {
      status: 'success',
      data: { transaction },
    };
  }

  @Get('user/:address')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get transactions by user address' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async findByUser(@Param('address') address: string) {
    const transactions =
      await this.transactionService.findByUserAddress(address);
    return {
      status: 'success',
      data: { transactions },
    };
  }

  @Get('token/:tokenId')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get transactions by token ID' })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  async findByToken(@Param('tokenId') tokenId: string) {
    const transactions = await this.transactionService.findByTokenId(tokenId);
    return {
      status: 'success',
      data: { transactions },
    };
  }
}
