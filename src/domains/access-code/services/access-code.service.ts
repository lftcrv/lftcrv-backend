import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccessCodeTokens,
  IAccessCodeGenerator,
  IAccessCodeService,
} from '../interfaces';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AccessCodeService implements IAccessCodeService {
  private readonly rateLimit: number;
  private readonly rateLimitWindow: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(AccessCodeTokens.Generator)
    private readonly codeGenerator: IAccessCodeGenerator,
  ) {
    this.rateLimit = this.configService.get('RATE_LIMIT', 10);
    this.rateLimitWindow = this.configService.get('RATE_LIMIT_WINDOW', 60);
  }

  async generateCodes(count: number): Promise<string[]> {
    const codes = Array.from({ length: count }, () => {
      const code = this.codeGenerator.generateCode();
      const hashedCode = this.codeGenerator.hashCode(code);
      return { code, hashedCode };
    });

    await this.prisma.oTP.createMany({
      data: codes.map(({ hashedCode }) => ({
        code: hashedCode,
        used: false,
      })),
    });

    return codes.map(({ code }) => code);
  }

  async verifyCode(
    code: string,
    clientIp: string,
  ): Promise<{
    success: boolean;
    message: string;
    remainingAttempts?: number;
  }> {
    const ipHash = this.codeGenerator.hashCode(clientIp);

    // Rate limiting check
    const windowStart = new Date(Date.now() - this.rateLimitWindow * 1000);
    const attemptCount = await this.prisma.failedAttempt.count({
      where: {
        ipHash,
        createdAt: { gte: windowStart },
      },
    });

    const remainingAttempts = Math.max(0, this.rateLimit - attemptCount);

    if (attemptCount >= this.rateLimit) {
      throw new BadRequestException({
        message: `Too many attempts. Please try again in ${this.rateLimitWindow} seconds.`,
        error: 'RATE_LIMIT',
        remainingAttempts: 0,
        rateLimitReset: this.rateLimitWindow,
      });
    }

    const hashedCode = this.codeGenerator.hashCode(code);
    const otpRecord = await this.prisma.oTP.findFirst({
      where: { code: hashedCode },
    });

    if (!otpRecord) {
      await this.prisma.failedAttempt.create({
        data: { ipHash, codeHash: hashedCode },
      });
      throw new BadRequestException({
        message: 'NGMI! Invalid code anon 🫡',
        error: 'INVALID_CODE',
        remainingAttempts: remainingAttempts - 1,
      });
    }

    if (otpRecord.used) {
      await this.prisma.failedAttempt.create({
        data: { ipHash, codeHash: hashedCode },
      });
      throw new BadRequestException({
        message: 'Too late anon! This code was already used 👀',
        error: 'CODE_USED',
        remainingAttempts: remainingAttempts - 1,
      });
    }

    await this.prisma.oTP.update({
      where: { id: otpRecord.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    await this.prisma.failedAttempt.deleteMany({
      where: { ipHash },
    });

    return {
      success: true,
      message: 'WAGMI 🚀',
    };
  }
}
