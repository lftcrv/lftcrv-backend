import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUserService } from './interfaces';
import { User } from './entities/user.entity';

@Injectable()
export class UserService implements IUserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // If access code is provided, verify and use it
    if (createUserDto.accessCode) {
      // Create user with referral code
      const user = await this.prisma.user.create({
        data: {
          starknetAddress: createUserDto.starknetAddress,
          evmAddress: createUserDto.evmAddress,
          addressType: createUserDto.addressType,
          twitterHandle: createUserDto.twitterHandle,
          usedReferralCode: createUserDto.accessCode,
        },
      });

      // Update the referral code usage count
      await this.prisma.referralCode.update({
        where: { code: createUserDto.accessCode },
        data: { usageCount: { increment: 1 } },
      });

      return user;
    }

    // Create user without referral code
    return this.prisma.user.create({
      data: {
        starknetAddress: createUserDto.starknetAddress,
        evmAddress: createUserDto.evmAddress,
        addressType: createUserDto.addressType,
        twitterHandle: createUserDto.twitterHandle,
      },
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByStarknetAddress(address: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { starknetAddress: address },
    });
  }

  async findByEvmAddress(address: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { evmAddress: address },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async connect(starknetAddress: string): Promise<User | null> {
    return this.prisma.user.update({
      where: { starknetAddress },
      data: { lastConnection: new Date() },
    });
  }
}
