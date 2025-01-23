import { Provider } from 'starknet';

export interface IProviderService {
  getProvider(): Provider;
}
