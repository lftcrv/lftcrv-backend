import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AccessCodeTokens, IAccessCodeService } from '../interfaces';

// Add type definition for Express Request with user property
// Using module augmentation instead of namespace
import 'express';
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      [key: string]: any;
    };
  }
}

@Injectable()
export class RequireAccessCodeMiddleware implements NestMiddleware {
  constructor(
    @Inject(AccessCodeTokens.Service)
    private readonly accessCodeService: IAccessCodeService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Check if access code system is enabled
    const isEnabled = this.configService.get<boolean>(
      'ACCESS_CODE_SYSTEM_ENABLED',
      false,
    );
    if (!isEnabled) {
      return next();
    }

    // Get user from request
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    // Check if user has a valid access code
    const user = await this.prisma.elizaAgent.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not found',
      });
    }

    // Check if user has access code
    // Using raw query to avoid TypeScript errors with the new schema
    const userWithAccessCode = await this.prisma.$queryRaw<any[]>`
      SELECT access_code_id FROM eliza_agents WHERE id = ${userId}
    `;

    if (!userWithAccessCode[0] || !userWithAccessCode[0].access_code_id) {
      return res.status(403).json({
        error: 'ACCESS_CODE_REQUIRED',
        message: 'Valid access code required',
      });
    }

    // Get the access code
    const accessCodes = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM access_codes WHERE id = ${userWithAccessCode[0].access_code_id}
    `;

    const accessCode = accessCodes[0];

    // Check if access code is active
    if (!accessCode || !accessCode.is_active) {
      return res.status(403).json({
        error: 'ACCESS_CODE_INACTIVE',
        message: 'Access code is not active',
      });
    }

    // Check if access code is expired
    if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
      return res.status(403).json({
        error: 'ACCESS_CODE_EXPIRED',
        message: 'Access code has expired',
      });
    }

    next();
  }
}

// Helper function to check if access code system is enabled
export function isAccessCodeSystemEnabled(
  configService: ConfigService,
): boolean {
  return configService.get<boolean>('ACCESS_CODE_SYSTEM_ENABLED', false);
}

// Helper function to check if a user has a valid access code
export async function hasValidAccessCode(
  user: any,
  prisma: PrismaService,
): Promise<boolean> {
  if (!user || !user.id) {
    return false;
  }

  // Get user's access code ID
  const userWithAccessCode = await prisma.$queryRaw<any[]>`
    SELECT access_code_id FROM eliza_agents WHERE id = ${user.id}
  `;

  if (!userWithAccessCode[0] || !userWithAccessCode[0].access_code_id) {
    return false;
  }

  // Get access code
  const accessCodes = await prisma.$queryRaw<any[]>`
    SELECT * FROM access_codes WHERE id = ${userWithAccessCode[0].access_code_id}
  `;

  const accessCode = accessCodes[0];

  if (!accessCode || !accessCode.is_active) {
    return false;
  }

  if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
    return false;
  }

  return true;
}
