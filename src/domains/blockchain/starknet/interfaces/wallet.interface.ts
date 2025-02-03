import { OZWallet } from '../entities/wallet.entity';

export interface IStarknetWallet {
  createWallet(): OZWallet;
  transferFunds(ozWallet: OZWallet): Promise<OZWallet>;
  deployWallet(ozWallet: OZWallet): Promise<OZWallet>;
}
