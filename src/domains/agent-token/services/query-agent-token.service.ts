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
    args?: any[],
  ) {
    try {
      const contract = await this.getContract(agentId);
      const result = await contract.call(method, args || []);
      return result;
    } catch (error) {
      console.error(`Error executing ${method} on contract:`, error);
      throw new Error(`Contract call failed: ${error.message}`);
    }
  }

  async simulateBuy(agentId: string, tokenAmount: bigint): Promise<bigint> {
    const result = await this.executeContractCall(agentId, 'simulate_buy', [
      tokenAmount.toString(),
    ]);

    // Handle object with numeric keys - take the first value ('0')
    return result && result['0'] ? BigInt(result['0'].toString()) : BigInt(0);
  }

  async getCurrentPrice(agentId: string): Promise<bigint> {
    const result = await this.executeContractCall(
      agentId,
      'get_current_price',
      [],
    );
    return result
      ? Array.isArray(result)
        ? BigInt(result[0].toString())
        : BigInt(result.toString())
      : BigInt(0);
  }

  async simulateSell(agentId: string, tokenAmount: bigint): Promise<bigint> {
    const result = await this.executeContractCall(agentId, 'simulate_sell', [
      tokenAmount.toString(),
    ]);

    // Handle object with numeric keys - take the first value ('0')
    return result && result['0'] ? BigInt(result['0'].toString()) : BigInt(0);
  }

  async bondingCurvePercentage(agentId: string): Promise<number> {
    const result = await this.executeContractCall(
      agentId,
      'supply_advancement_percentage_x100',
      [],
    );
    return result
      ? Number(
          Array.isArray(result)
            ? BigInt(result[0].toString())
            : BigInt(result.toString()),
        )
      : 0;
  }

  async getMarketCap(agentId: string): Promise<bigint> {
    const result = await this.executeContractCall(agentId, 'market_cap', []);
    return result
      ? Array.isArray(result)
        ? BigInt(result[0].toString())
        : BigInt(result.toString())
      : BigInt(0);
  }
}
