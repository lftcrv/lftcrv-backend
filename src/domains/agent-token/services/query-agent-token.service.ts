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

    const abi = await this.abiService.getAbi(agent.Token.contractAddress);
    if (!abi) {
      throw new Error(
        `ABI not found for contract at address ${agent.Token.contractAddress}`,
      );
    }

    return new Contract(
      abi,
      agent.Token.contractAddress,
      this.providerService.getProvider(),
    );
  }

  private async executeContractCall(
    agentId: string,
    method: string,
    tokenAmount: bigint,
  ): Promise<bigint> {
    try {
      const contract = await this.getContract(agentId);
      const result = await contract.call(method, [tokenAmount]);
      return BigInt(result.toString());
    } catch (error) {
      console.error(`Error executing ${method} on contract:`, error);
      throw new Error(`Contract call failed: ${error.message}`);
    }
  }

  async simulateBuy(agentId: string, tokenAmount: bigint): Promise<bigint> {
    return this.executeContractCall(agentId, 'simulate_buy', tokenAmount);
  }

  async simulateSell(agentId: string, tokenAmount: bigint): Promise<bigint> {
    return this.executeContractCall(agentId, 'simulate_sell', tokenAmount);
  }

  async bondingCurvePercentage(agentId: string): Promise<number> {
    try {
      const contract = await this.getContract(agentId);
      const result = await contract.call(
        'supply_advancement_percentage_x100',
        [],
      );
      return Number(result[0]);
    } catch (error) {
      console.error('Error getting bonding curve percentage:', error);
      throw new Error(`Bonding curve percentage call failed: ${error.message}`);
    }
  }
}
