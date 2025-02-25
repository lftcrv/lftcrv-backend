import { validate } from 'class-validator';
import { CreateUserDto } from '../create-user.dto';
import { WalletAddressType } from '@prisma/client';

describe('CreateUserDto', () => {
  let dto: CreateUserDto;

  beforeEach(() => {
    dto = new CreateUserDto();
    dto.starknetAddress = '0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5';
    dto.evmAddress = '0xabd7d15dfdf36e077a2c7f3875f75cfe299ecf2e';
    dto.addressType = WalletAddressType.DERIVED;
    dto.twitterHandle = '@username';
    dto.accessCode = 'CODE123';
  });

  it('should validate a correct dto', async () => {
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should require starknetAddress', async () => {
    dto.starknetAddress = undefined;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('should accept optional evmAddress', async () => {
    dto.evmAddress = undefined;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should require addressType', async () => {
    dto.addressType = undefined;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isEnum');
  });

  it('should validate addressType enum values', async () => {
    dto.addressType = 'INVALID' as any;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isEnum');
  });

  it('should accept optional twitterHandle', async () => {
    dto.twitterHandle = undefined;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept optional accessCode', async () => {
    dto.accessCode = undefined;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should validate starknetAddress format', async () => {
    dto.starknetAddress = 'invalid-address';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    // Add specific validation for Starknet address format if needed
  });

  it('should validate evmAddress format when provided', async () => {
    dto.evmAddress = 'invalid-address';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    // Add specific validation for EVM address format if needed
  });
}); 