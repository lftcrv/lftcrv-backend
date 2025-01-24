import { Injectable } from '@nestjs/common';
import { IBondingCurveService } from '../interfaces/bonding-curve.interface';

@Injectable()
export class BondingCurveService implements IBondingCurveService {
  constructor() {}

  async getBondingCurvePercentage(agentTokenId: string): Promise<number> {
    console.log(agentTokenId);
    return 0;
  }
}
