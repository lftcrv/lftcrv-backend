export interface TransactionDto {
  buyToken: string;
  sellToken: string;
  buyAmount: bigint;
  sellAmount: bigint;
  hash: string;
  tokenId: string;
  userAddress: string;
}
