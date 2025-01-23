import Module from "module";
import { CandlestickService } from "./services/candlestick.service";
import { MomentumService } from "./services/momentum.service";
import { MovingAverageService } from "./services/moving-average.service";
import { PriceService } from "./services/price.service";
import { SupportResistanceService } from "./services/support-resistance.service";
import { VolumeService } from "./services/volume.service";

// @Module({
//     imports: [],
//     providers: [
//         PriceService,
//         CandlestickService,
//         MovingAverageService,
//         MomentumService,
//         VolumeService,
//         SupportResistanceService,
//         TechnicalService
//     ],
//     exports: [TechnicalService]
// })
export class TechnicalModule {}