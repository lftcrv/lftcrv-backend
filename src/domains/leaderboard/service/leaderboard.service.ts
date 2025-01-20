import { Injectable } from '@nestjs/common';
import { ILeaderboardService } from '../interfaces/leaderboard.interface';
import { LeaderboardEntry } from '../entities/leaderboard.entity';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class LeaderboardService implements ILeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getLeftCurveLeaderboard(): Promise<LeaderboardEntry[]> {
    const leftCurve = await this.prisma.elizaAgent.findMany({
      where: {
        curveSide: 'LEFT',
        status: 'RUNNING',
      },
      orderBy: {
        degenScore: 'desc',
      },
    });

    return leftCurve.map((agent) => ({
      id: agent.id,
      name: agent.name,
      score: Math.floor(Math.random() * 100),
      holders: Math.floor(Math.random() * 100),
      price: Math.floor(Math.random() * 100),
      marketCap: Math.floor(Math.random() * 100),
      token: agent.name.toUpperCase(),
    }));
  }

  async getRightCurveLeaderboard(): Promise<LeaderboardEntry[]> {
    const rightCurve = await this.prisma.elizaAgent.findMany({
      where: {
        curveSide: 'RIGHT',
        status: 'RUNNING',
      },
      orderBy: {
        winScore: 'desc',
      },
    });

    return rightCurve.map((agent) => ({
      id: agent.id,
      name: agent.name,
      score: Math.floor(Math.random() * 100),
      holders: Math.floor(Math.random() * 100),
      price: Math.floor(Math.random() * 100),
      marketCap: Math.floor(Math.random() * 100),
      token: agent.name.toUpperCase(),
    }));
  }
}
