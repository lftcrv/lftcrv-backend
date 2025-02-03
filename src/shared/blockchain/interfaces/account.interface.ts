import { Account } from 'starknet';

export interface IAccountService {
  getAdminAccount(): Account;
}
