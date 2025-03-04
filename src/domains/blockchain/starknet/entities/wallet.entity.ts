export interface OZWallet {
  privateKey: string;
  starkKeyPub: string;
  ozContractAddress: string;
  ozAccountClassHash: string;
  ozAccountConstructorCallData: any;
  fundTransactionHash?: string;
  deployTransactionHash?: string;
  deployedContractAddress?: string;
  ethereumPrivateKey?: string;
  ethereumAccountAddress?: string;
}
