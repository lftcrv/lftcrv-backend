import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { CreatorsController } from './controllers/creators.controller';
import { CreatorsService } from './services/creators.service';
import { ServiceTokens } from './interfaces';

@Module({
  imports: [PrismaModule],
  controllers: [CreatorsController],
  providers: [
    {
      provide: ServiceTokens.CreatorsService,
      useClass: CreatorsService,
    },
  ],
  exports: [
    {
      provide: ServiceTokens.CreatorsService,
      useClass: CreatorsService,
    },
  ],
})
export class CreatorsModule {}
