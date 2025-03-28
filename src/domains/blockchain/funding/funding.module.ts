import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { FundingService } from './funding.service';
import { FundingController } from './funding.controller';  // ✅ Missing import
import { BlockchainModule } from '../../../shared/blockchain/blockchain.module';
import { MessageModule } from 'src/message/message.module';

@Module({
  imports: [PrismaModule, BlockchainModule, MessageModule],
  controllers: [FundingController],
  providers: [FundingService],
})
export class FundingModule {}
