export class AgentWallet {
  id: string;
  privateKey: string;
  publicKey: string;
  contractAddress: string;
  fundTransactionHash?: string;
  deployTransactionHash?: string;
  deployedAddress?: string;
  createdAt: Date;
  updatedAt: Date;
  agentId: string;
}
