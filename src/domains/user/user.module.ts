import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserTokens } from './interfaces';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    {
      provide: UserTokens.Service,
      useClass: UserService,
    },
  ],
  exports: [UserTokens.Service],
})
export class UserModule {}
