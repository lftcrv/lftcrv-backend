import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  BlockchainTokens,
  IProviderService,
} from '../../../shared/blockchain/interfaces';
import { MessageService } from 'src/message/message.service';

@Injectable()
export class FundingService {
  private readonly logger = new Logger(FundingService.name);
  private static readonly POLLING_INTERVAL_MS = 5000;
  private static readonly MAX_POLLING_ATTEMPTS = 60;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
    private readonly messageService: MessageService,
  ) {}

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async pollTransactionStatus(txHash: string): Promise<boolean> {
    const provider = this.providerService.getProvider();
    let attempts = 0;

    while (attempts < FundingService.MAX_POLLING_ATTEMPTS) {
      try {
        this.logger.log(
          `🔄 Checking transaction status (attempt ${attempts + 1})`,
        );
        const txStatus = await provider.getTransactionStatus(txHash);
        const finalityStatus = txStatus.finality_status;
        
        if (
          finalityStatus === 'ACCEPTED_ON_L2' ||
          finalityStatus === 'ACCEPTED_ON_L1'
        ) {
          this.logger.log(
            `✅ Transaction ${txHash} confirmed on ${finalityStatus}`,
          );
          return true;
        }

        if (finalityStatus === 'REJECTED') {
          this.logger.error(`❌ Transaction ${txHash} rejected`);
          return false;
        }

        this.logger.log(
          `⏳ Transaction status: ${finalityStatus}, retrying...`,
        );
        await this.delay(FundingService.POLLING_INTERVAL_MS);
        attempts++;
      } catch (error) {
        this.logger.error(`❌ Error checking transaction status:`, error);
        await this.delay(FundingService.POLLING_INTERVAL_MS);
        attempts++;
      }
    }

    this.logger.error(
      `❌ Transaction ${txHash} not confirmed after max attempts`,
    );
    return false;
  }

  async recordFunding(
    txHash: string,
    runtimeAgentId: string,
    sender: string,
    amount: number,
  ) {
    const agent = await this.prisma.elizaAgent.findFirst({
      where: {
        runtimeAgentId: {
          startsWith: runtimeAgentId,
        },
      },
      include: { Wallet: true },
    });

    if (!agent) {
      throw new BadRequestException(
        `Agent with runtimeAgentId ${runtimeAgentId} not found.`,
      );
    }

    if (!agent.Wallet) {
      throw new BadRequestException(
        `No wallet found for agent ${runtimeAgentId}.`,
      );
    }

    const recipient = agent.Wallet.contractAddress;

    // 2️⃣ Poll for transaction confirmation
    const confirmed = await this.pollTransactionStatus(txHash);
    if (!confirmed) {
      throw new BadRequestException(`Transaction ${txHash} was not confirmed.`);
    }

    // 3️⃣ Store the deposit in `LiquidityDeposit`
    const deposit = await this.prisma.liquidityDeposit.create({
      data: {
        txHash,
        runtimeAgentId,
        sender,
        amount: BigInt(amount),
        recipient,
      },
    });

    this.logger.log(
      `📢 Sending deposit instruction to agent: ${runtimeAgentId}`,
    );

    const depositMessage = `execute deposit_to_paradex ${amount} usdc to ${recipient}`;
    await this.messageService.sendMessageToAgent(runtimeAgentId, {
      content: { text: depositMessage },
    });

    return {
      status: 'success',
      data: deposit,
    };
  }
}
