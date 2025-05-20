import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { TokenMasterController } from './token-master.controller';
import { TokenMasterService } from './services/token-master.service';

@Module({
  imports: [PrismaModule],
  controllers: [TokenMasterController],
  providers: [TokenMasterService],
  exports: [TokenMasterService],
})
export class TokenMasterModule {}
