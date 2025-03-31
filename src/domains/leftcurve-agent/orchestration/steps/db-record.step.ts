import { Injectable, Inject, Logger } from '@nestjs/common';
import { AgentStatus } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';
import {
  StepExecutionContext,
  StepExecutionResult,
} from '../../../../domains/orchestration/interfaces';
import { BaseStepExecutor } from '../../../../domains/orchestration/services/base-step-executor';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  BlockchainTokens,
  IProviderService,
} from '../../../../shared/blockchain/interfaces';

const POLLING_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLLING_ATTEMPTS = 60; // 5 minutes total

@Injectable()
export class CreateDbRecordStep extends BaseStepExecutor {
  private readonly logger = new Logger(CreateDbRecordStep.name);

  private readonly tempDir = 'uploads/temp';
  private readonly uploadDir = 'uploads/profile-pictures';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
  ) {
    super({
      stepId: 'create-db-record',
      stepType: 'agent-creation',
      priority: 1,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async pollTransactionStatus(txHash: string): Promise<boolean> {
    const provider = this.providerService.getProvider();
    let attempts = 0;

    while (attempts < MAX_POLLING_ATTEMPTS) {
      try {
        console.log(
          `🔄 Checking transaction status (attempt ${attempts + 1}/${MAX_POLLING_ATTEMPTS})...`,
        );
        const txStatus = await provider.getTransactionStatus(txHash);

        if (txStatus.finality_status === 'ACCEPTED_ON_L2') {
          console.log('✅ Transaction confirmed on L2');
          return true;
        } else if (txStatus.finality_status === 'REJECTED') {
          console.log('❌ Transaction rejected');
          return false;
        }

        console.log(
          `⏳ Transaction status: ${txStatus.finality_status}, waiting ${POLLING_INTERVAL_MS / 1000}s...`,
        );
        await this.delay(POLLING_INTERVAL_MS);
        attempts++;
      } catch (error) {
        console.error('Error checking transaction status:', error);
        await this.delay(POLLING_INTERVAL_MS);
        attempts++;
      }
    }

    return false;
  }

  private async moveProfilePicture(
    tempFileName: string,
    agentId: string,
  ): Promise<string | null> {
    if (!tempFileName) return null;

    try {
      // Always use .png extension for consistency
      const finalFileName = `${agentId}.png`;
      const tempFilePath = path.join(this.tempDir, tempFileName);
      const finalFilePath = path.join(this.uploadDir, finalFileName);

      console.log('🔄 Moving profile picture:', {
        from: tempFilePath,
        to: finalFilePath,
      });

      // Ensure the upload directory exists
      await fs.mkdir(this.uploadDir, { recursive: true });

      // Move the file
      await fs.rename(tempFilePath, finalFilePath);
      console.log('✅ Profile picture moved successfully:', finalFileName);
      return finalFileName;
    } catch (error) {
      console.error('❌ Failed to move profile picture:', error);
      return null;
    }
  }

  async execute(context: StepExecutionContext): Promise<StepExecutionResult> {
    try {
      const dto = context.data;
      this.logger.log('🚀 receiving dto:', dto);

      console.log('📦 Received DTO data:', {
        ...dto,
        characterConfig: '[redacted]',
        agentConfig: '[redacted]',
      });

      // Verify transaction hash exists
      if (!dto.transactionHash) {
        return this.failure('Missing transaction hash for deployment payment');
      }

      // Handle forking logic if forkedFromId is provided
      let config = dto.characterConfig || dto.agentConfig || null;

      if (dto.forkedFromId) {
        try {
          console.log(`🍴 Forking from agent with ID: ${dto.forkedFromId}`);

          // Get the source agent
          const sourceAgent = await this.prisma.elizaAgent.findUnique({
            where: { id: dto.forkedFromId },
            include: { LatestMarketData: true },
          });

          if (!sourceAgent) {
            return this.failure(
              `Source agent with ID ${dto.forkedFromId} not found`,
            );
          }

          // Use the source agent's config if none provided
          if (!config) {
            config = sourceAgent.characterConfig;
            console.log('📋 Using source agent configuration');
          }

          // Increment the fork count for the source agent
          if (sourceAgent.LatestMarketData) {
            try {
              // Use direct update instead of increment operation to avoid type issues
              await this.prisma.latestMarketData.update({
                where: { id: sourceAgent.LatestMarketData.id },
                data: {
                  forkCount: sourceAgent.LatestMarketData.forkCount + 1,
                },
              });
              console.log(
                `📊 Incremented fork count for source agent ${dto.forkedFromId}`,
              );
            } catch (error) {
              console.error(
                `⚠️ Failed to increment fork count: ${error.message}`,
              );
              // Continue execution even if this fails
            }
          }
        } catch (error) {
          console.error(`❌ Error during forking process: ${error.message}`);
          // Continue with creation even if forking fails
        }
      }

      // If still no config, return failure
      if (!config) {
        return this.failure(
          'Missing agent configuration (characterConfig or agentConfig required)',
        );
      }

      // Poll for transaction confirmation
      const isConfirmed = await this.pollTransactionStatus(dto.transactionHash);
      if (!isConfirmed) {
        return this.failure(
          'Transaction not confirmed on L2 after maximum attempts',
        );
      }

      // Create agent first
      const createInput = {
        name: dto.name,
        curveSide: dto.curveSide,
        status: AgentStatus.STARTING,
        characterConfig: config,
        creatorWallet: dto.creatorWallet,
        deploymentFeesTxHash: dto.transactionHash,
        degenScore: 0,
        winScore: 0,
        forkedFromId: dto.forkedFromId, // Add the forkedFromId if provided
        LatestMarketData: {
          create: {
            price: 0,
            priceChange24h: 0,
            holders: 0,
            marketCap: 0,
            forkCount: 0,
            pnlCycle: 0,
            pnl24h: 0,
            tradeCount: 0,
            tvl: 0,
          },
        },
      };

      const agent = await this.prisma.elizaAgent.create({
        data: createInput,
      });

      console.log('🔐 Payment TX status verified:', dto.transactionHash);
      console.log('📝 Agent created with ID:', agent.id);

      // If there's a profile picture, move it and set the path
      if (dto.profilePicture?.startsWith('temp_')) {
        console.log('🖼️ Moving profile picture from temp:', dto.profilePicture);
        const finalFileName = await this.moveProfilePicture(
          dto.profilePicture,
          agent.id,
        );
        if (finalFileName) {
          await this.prisma.elizaAgent.update({
            where: { id: agent.id },
            data: {
              profilePicture: finalFileName,
            } as { profilePicture: string },
          });
          console.log(
            '✅ Profile picture moved and path updated:',
            finalFileName,
          );
        } else {
          console.error('❌ Failed to move profile picture from temp');
        }
      }

      return this.success(agent, { agentId: agent.id });
    } catch (error) {
      console.error('❌ Agent creation failed:', {
        error: error.message,
        dto: context.data,
      });
      return this.failure(`Failed to create agent record: ${error.message}`);
    }
  }
}
