import { Module, Provider } from '@nestjs/common';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { CreatorsController } from './controllers/creators.controller';
import { CreatorsService } from './services/creators.service';
import { ICreatorsService, ServiceTokens } from './interfaces';

// Define the provider configuration once
const creatorsServiceProvider: Provider<ICreatorsService> = {
  provide: ServiceTokens.CreatorsService,
  useClass: CreatorsService,
};

@Module({
  imports: [PrismaModule],
  controllers: [CreatorsController],
  providers: [
    creatorsServiceProvider, // Use the constant
  ],
  exports: [
    creatorsServiceProvider, // Reuse the constant
  ],
})
export class CreatorsModule {}
 