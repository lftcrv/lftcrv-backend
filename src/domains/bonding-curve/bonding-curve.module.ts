import { Module } from '@nestjs/common';
import { BondingCurveTokens } from './interfaces';
import { CreateBondingCurveService } from './services/create-bonding-curve.service';

@Module({
  providers: [
    {
      provide: BondingCurveTokens.CreateBondingCurve,
      useClass: CreateBondingCurveService,
    },
  ],
  exports: [BondingCurveTokens.CreateBondingCurve],
})
export class BondingCurveModule {}
