import { Injectable } from '@nestjs/common';
import { AccessCodeMetrics, IAccessCodeMetricsService } from '../interfaces';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AccessCodeMetricsService implements IAccessCodeMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<AccessCodeMetrics> {
    const [totalCodes, usedCodes, unusedCodes] = await Promise.all([
      this.prisma.oTP.count(),
      this.prisma.oTP.count({ where: { used: true } }),
      this.prisma.oTP.count({ where: { used: false } }),
    ]);

    // Calculate usage rate as a number (0-1)
    const usageRate = totalCodes > 0 ? usedCodes / totalCodes : 0;

    return {
      totalCodes,
      usedCodes,
      unusedCodes,
      usageRate,
    };
  }
}
