import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Contract } from 'starknet';
import { IManageAgentToken } from '../interfaces/manage-agent-token.interface';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  BlockchainTokens,
  IAbiService,
  IAccountService,
  IProviderService,
} from '../../../shared/blockchain/interfaces';

@Injectable()
export class AgentTokenService implements IManageAgentToken {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BlockchainTokens.Provider)
    private readonly providerService: IProviderService,
    @Inject(BlockchainTokens.Abi)
    private readonly abiService: IAbiService,
    @Inject(BlockchainTokens.Account)
    private readonly accountService: IAccountService,
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
    contract.connect(this.accountService.getAdminAccount());
    const result = await contract[method](tokenAmount);
    return BigInt(result.toString());
  }

  async buy(agentId: string, tokenAmount: bigint): Promise<bigint> {
    return this.executeContractCall(agentId, 'buy', tokenAmount);
  }

  async sell(agentId: string, tokenAmount: bigint): Promise<bigint> {
    return this.executeContractCall(agentId, 'sell', tokenAmount);
  }

  async simulateBuy(agentId: string, tokenAmount: bigint): Promise<bigint> {
    return this.executeContractCall(agentId, 'simulate_buy', tokenAmount);
  }

  async simulateSell(agentId: string, tokenAmount: bigint): Promise<bigint> {
    return this.executeContractCall(agentId, 'simulate_sell', tokenAmount);
  }
}
