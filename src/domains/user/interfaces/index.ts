import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

export const UserTokens = {
  Service: 'USER_SERVICE',
} as const;

export interface IUserService {
  create(createUserDto: CreateUserDto): Promise<User>;
  findAll(): Promise<User[]>;
  findOne(id: string): Promise<User | null>;
  findByStarknetAddress(address: string): Promise<User | null>;
  findByEvmAddress(address: string): Promise<User | null>;
  update(id: string, updateUserDto: UpdateUserDto): Promise<User | null>;
  connect(starknetAddress: string): Promise<User | null>;
} 