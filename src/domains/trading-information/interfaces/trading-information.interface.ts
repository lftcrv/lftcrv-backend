import { TradingInformationDto } from '../dtos/trading-information.dto';
import { TradingInformation } from '../entities/trading-information.entity';

export interface ITradingInformation {
  getAllTradingInformation(): Promise<TradingInformation[]>;
  getTradingInformationPerAgent(databaseId: string): Promise<TradingInformation[]>;
  getTradingInformation(id: string): Promise<TradingInformation>;
  createTradingInformation(
    data: TradingInformationDto,
  ): Promise<TradingInformation>;
}
