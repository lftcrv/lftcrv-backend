import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Param,
  Put,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoggingInterceptor } from '../../shared/interceptors/logging.interceptor';
import { RequireApiKey } from '../../shared/auth/decorators/require-api-key.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConnectUserDto } from './dto/connect-user.dto';
import { IUserService, UserTokens } from './interfaces';
import { User } from './entities/user.entity';

@ApiTags('Users')
@Controller('api/users')
@UseInterceptors(LoggingInterceptor)
export class UserController {
  constructor(
    @Inject(UserTokens.Service)
    private readonly userService: IUserService,
  ) {}

  @Post()
  @RequireApiKey()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user data provided' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<{ status: string; data: { user: User } }> {
    const user = await this.userService.create(createUserDto);
    return {
      status: 'success',
      data: { user },
    };
  }

  @Get()
  @RequireApiKey()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(): Promise<{ status: string; data: { users: User[] } }> {
    const users = await this.userService.findAll();
    return {
      status: 'success',
      data: { users },
    };
  }

  @Get(':id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return {
      status: 'success',
      data: { user },
    };
  }

  @Get('starknet/:address')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a user by Starknet address' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByStarknetAddress(@Param('address') address: string) {
    const user = await this.userService.findByStarknetAddress(address);
    if (!user) {
      throw new NotFoundException(
        `User with Starknet address ${address} not found`,
      );
    }
    return {
      status: 'success',
      data: { user },
    };
  }

  @Get('evm/:address')
  @RequireApiKey()
  @ApiOperation({ summary: 'Get a user by EVM address' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByEvmAddress(@Param('address') address: string) {
    const user = await this.userService.findByEvmAddress(address);
    if (!user) {
      throw new NotFoundException(`User with EVM address ${address} not found`);
    }
    return {
      status: 'success',
      data: { user },
    };
  }

  @Post('connect')
  @RequireApiKey()
  @ApiOperation({ summary: 'Connect user and update last connection time' })
  @ApiResponse({ status: 200, description: 'User connected successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async connectUser(
    @Body() connectUserDto: ConnectUserDto,
  ): Promise<{ status: string; data: { user: User } }> {
    const user = await this.userService.connect(connectUserDto.starknetAddress);
    if (!user) {
      throw new NotFoundException('No user found with this Starknet address');
    }
    return {
      status: 'success',
      data: { user },
    };
  }

  @Put(':id')
  @RequireApiKey()
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.userService.update(id, updateUserDto);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return {
      status: 'success',
      data: { user },
    };
  }
}
