import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Contract } from 'starknet';
import { IQueryAgentToken } from '../interfaces/query-agent-token.interface';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  BlockchainTokens,
  IAbiService,
  IProviderService,
} from '../../../shared/blockchain/interfaces';

@Injectable()
export class QueryAgentTokenService implements IQueryAgentToken {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
    @Inject(BlockchainTokens.Abi)
    private readonly abiService: IAbiService,
  ) {}

  private async getContract(agentId: string): Promise<Contract> {
    const agent = await this.prisma.elizaAgent.findUnique({
      where: { id: agentId },
      include: { Token: true },
    });

    if (!agent?.Token) {
      throw new NotFoundException(`Agent ${agentId} or its token not found`);
    }

    const contract = new Contract(
      await this.abiService.getAbi(agent.Token.contratAddress),
      agent.Token.contratAddress,
      this.providerService.getProvider(),
    );

    return contract;
  }

  private async executeContractCall(
    agentId: string,
    method: string,
    tokenAmount: bigint,
  ): Promise<bigint> {
    const contract = await this.getContract(agentId);
    return contract.execute(method, [tokenAmount]);
  }

  async simulateBuy(agentId: string, tokenAmount: bigint): Promise<bigint> {
    const totalEth = await this.executeContractCall(
      agentId,
      'buy',
      tokenAmount,
    );

    return totalEth;
  }

  async simulateSell(agentId: string, tokenAmount: bigint): Promise<bigint> {
    const totalSold = await this.executeContractCall(
      agentId,
      'sell',
      tokenAmount,
    );

    return totalSold;
  }
}
