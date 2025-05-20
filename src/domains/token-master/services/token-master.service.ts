import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TokenMaster } from '@prisma/client'; // Import the Prisma-generated type
import {
  CreateTokenMasterDto,
  CreateBatchTokenMasterDto,
} from '../dtos/create-token-master.dto';
import {
  UpdateTokenMasterDto,
  BatchUpdateTokenPriceDto,
} from '../dtos/update-token-master.dto';
import { BatchUpdateTokenPriceBySymbolDto } from '../dtos/batch-update-token-price-by-symbol.dto';

@Injectable()
export class TokenMasterService {
  private readonly logger = new Logger(TokenMasterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateTokenMasterDto): Promise<TokenMaster> {
    try {
      return await this.prisma.tokenMaster.create({
        data: {
          canonicalSymbol: createDto.canonicalSymbol,
          chainID: createDto.chainID,
          dexScreenerSymbol: createDto.dexScreenerSymbol,
          contractAddress: createDto.contractAddress,
          foundQuoteSymbol: createDto.foundQuoteSymbol,
          priceUSD: createDto.priceUSD,
          method: createDto.method,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create token: ${error.message}`,
        error.stack,
      );
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new BadRequestException(
          `Token with contract address '${createDto.contractAddress}' on chain '${createDto.chainID}' already exists.`,
        );
      }
      throw new BadRequestException('Could not create token.');
    }
  }

  async createBatch(
    batchCreateDto: CreateBatchTokenMasterDto,
  ): Promise<{ count: number }> {
    const dataToCreate = batchCreateDto.tokens.map((token) => ({
      canonicalSymbol: token.canonicalSymbol,
      chainID: token.chainID,
      dexScreenerSymbol: token.dexScreenerSymbol,
      contractAddress: token.contractAddress,
      foundQuoteSymbol: token.foundQuoteSymbol,
      priceUSD: token.priceUSD,
      method: token.method,
    }));

    try {
      const result = await this.prisma.tokenMaster.createMany({
        data: dataToCreate,
        skipDuplicates: true, // Important for batch operations
      });
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create batch tokens: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Could not create batch tokens.');
    }
  }

  async findAll(): Promise<{ tokens: TokenMaster[]; count: number }> {
    const tokens = await this.prisma.tokenMaster.findMany();
    const count = await this.prisma.tokenMaster.count();
    return { tokens, count };
  }

  async findAllPrices(): Promise<
    { canonicalSymbol: string; priceUSD: number | null }[]
  > {
    return this.prisma.tokenMaster.findMany({
      select: {
        canonicalSymbol: true,
        priceUSD: true,
      },
    });
  }

  async findPricesBySymbols(
    symbols: string[],
  ): Promise<{ canonicalSymbol: string; priceUSD: number | null }[]> {
    return this.prisma.tokenMaster.findMany({
      where: {
        canonicalSymbol: {
          in: symbols,
        },
      },
      select: {
        canonicalSymbol: true,
        priceUSD: true,
      },
    });
  }

  async findOne(id: string): Promise<TokenMaster | null> {
    const token = await this.prisma.tokenMaster.findUnique({
      where: { id },
    });
    if (!token) {
      throw new NotFoundException(`Token with ID '${id}' not found.`);
    }
    return token;
  }

  // Alternative find by contractAddress and chainID
  async findByContractAndChain(
    contractAddress: string,
    chainID: string,
  ): Promise<TokenMaster | null> {
    const token = await this.prisma.tokenMaster.findUnique({
      where: {
        unique_token_on_chain: { contractAddress, chainID },
      },
    });
    if (!token) {
      throw new NotFoundException(
        `Token with contract '${contractAddress}' on chain '${chainID}' not found.`,
      );
    }
    return token;
  }

  async update(
    id: string,
    updateDto: UpdateTokenMasterDto,
  ): Promise<TokenMaster> {
    try {
      return await this.prisma.tokenMaster.update({
        where: { id },
        data: updateDto, // Assumes DTO fields match model fields or are optional
      });
    } catch (error) {
      this.logger.error(
        `Failed to update token ${id}: ${error.message}`,
        error.stack,
      );
      if (error.code === 'P2025') {
        // Record to update not found
        throw new NotFoundException(
          `Token with ID '${id}' not found for update.`,
        );
      }
      if (error.code === 'P2002') {
        // Unique constraint violation on update
        throw new BadRequestException(
          `Update failed due to unique constraint violation. Check contractAddress and chainID if provided.`,
        );
      }
      throw new BadRequestException('Could not update token.');
    }
  }

  async updatePrice(id: string, priceUSD: number): Promise<TokenMaster> {
    try {
      return await this.prisma.tokenMaster.update({
        where: { id },
        data: { priceUSD },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update price for token ${id}: ${error.message}`,
        error.stack,
      );
      if (error.code === 'P2025') {
        throw new NotFoundException(
          `Token with ID '${id}' not found for price update.`,
        );
      }
      throw new BadRequestException('Could not update token price.');
    }
  }

  async updatePricesBatch(
    batchUpdateDto: BatchUpdateTokenPriceDto,
  ): Promise<{ count: number }> {
    const operations = batchUpdateDto.updates.map((update) => {
      if (!this.isValidUUID(update.id)) {
        this.logger.warn(
          `Skipping update for invalid ID format: ${update.id} in batch price update.`,
        );
        return null; // Skip this operation
      }
      return this.prisma.tokenMaster.updateMany({
        where: { id: update.id },
        data: { priceUSD: update.priceUSD },
      });
    });

    const validOperations = operations.filter((op) => op !== null);

    if (validOperations.length === 0 && batchUpdateDto.updates.length > 0) {
      throw new BadRequestException(
        'No valid operations to perform in batch price update. Check ID formats.',
      );
    }
    if (validOperations.length === 0) {
      return { count: 0 }; // No operations to perform
    }

    try {
      const results = await this.prisma.$transaction(validOperations as any);
      const totalUpdated = results.reduce(
        (sum, result) => sum + result.count,
        0,
      );
      return { count: totalUpdated };
    } catch (error) {
      this.logger.error(
        `Failed to update batch prices: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Could not update batch prices.');
    }
  }

  async batchUpdatePricesBySymbol(
    batchUpdateDto: BatchUpdateTokenPriceBySymbolDto,
  ): Promise<{ count: number; notFound: string[] }> {
    const { updates } = batchUpdateDto;
    let updatedCount = 0;
    const notFoundSymbols: string[] = [];

    for (const update of updates) {
      try {
        const result = await this.prisma.tokenMaster.updateMany({
          where: { canonicalSymbol: update.symbol },
          data: { priceUSD: update.price },
        });
        if (result.count > 0) {
          updatedCount += result.count;
        } else {
          notFoundSymbols.push(update.symbol);
          this.logger.warn(
            `Token with symbol '${update.symbol}' not found for price update.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error updating price for symbol ${update.symbol}: ${error.message}`,
          error.stack,
        );
        // Decide if you want to throw or collect errors
        // For now, we log and add to notFoundSymbols if it was a not-found type issue indirectly
        // Or just continue if it was another type of error, to let other updates proceed.
      }
    }

    if (updatedCount === 0 && notFoundSymbols.length === updates.length) {
      throw new NotFoundException(
        'None of the provided token symbols were found for price update.',
      );
    }

    return { count: updatedCount, notFound: notFoundSymbols };
  }

  async remove(id: string): Promise<TokenMaster> {
    try {
      return await this.prisma.tokenMaster.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete token ${id}: ${error.message}`,
        error.stack,
      );
      if (error.code === 'P2025') {
        // Record to delete not found
        throw new NotFoundException(
          `Token with ID '${id}' not found for deletion.`,
        );
      }
      throw new BadRequestException('Could not delete token.');
    }
  }

  async removeBatch(ids: string[]): Promise<{ count: number }> {
    const validIds = ids.filter((id) => this.isValidUUID(id));
    if (validIds.length !== ids.length) {
      this.logger.warn(
        'Some invalid ID formats were provided for batch deletion and will be skipped.',
      );
    }
    if (validIds.length === 0) {
      throw new BadRequestException(
        'No valid IDs provided for batch deletion.',
      );
    }
    try {
      return await this.prisma.tokenMaster.deleteMany({
        where: { id: { in: validIds } },
      });
    } catch (error) {
      this.logger.error(
        `Failed to delete batch tokens: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Could not delete batch tokens.');
    }
  }

  // Helper to check if a string is a UUID (simple check)
  private isValidUUID(id: string): boolean {
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(id);
  }
}
