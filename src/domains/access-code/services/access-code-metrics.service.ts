import { Injectable } from '@nestjs/common';
import { IAccessCodeMetricsService } from '../interfaces';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AccessCodeMetricsService implements IAccessCodeMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(): Promise<{
    totalCodes: number;
    usedCodes: number;
    unusedCodes: number;
    failedAttempts: number;
    successRate: string;
    recentCodes: any[];
    recentFailedAttempts: any[];
  }> {
    const [totalCodes, usedCodes, unusedCodes, failedAttempts] =
      await Promise.all([
        this.prisma.oTP.count(),
        this.prisma.oTP.count({ where: { used: true } }),
        this.prisma.oTP.count({ where: { used: false } }),
        this.prisma.failedAttempt.count(),
      ]);

    const recentCodes = await this.prisma.oTP.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        code: true,
        used: true,
        createdAt: true,
      },
    });

    const recentFailedAttempts = await this.prisma.failedAttempt.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        ipHash: true,
        createdAt: true,
      },
    });

    return {
      totalCodes,
      usedCodes,
      unusedCodes,
      failedAttempts,
      successRate:
        totalCodes > 0
          ? `${((usedCodes / totalCodes) * 100).toFixed(2)}%`
          : '0%',
      recentCodes,
      recentFailedAttempts,
    };
  }
}
