import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ConnectUserDto {
  @ApiProperty({
    description: 'Starknet wallet address',
    example:
      '0x65837757b2a9525eb820d4d5781a8d1bae43a8c0a81cc9e640b3522cd2e012e5',
  })
  @IsString()
  starknetAddress: string;
}
