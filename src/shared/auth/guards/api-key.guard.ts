import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    const apiKey = this.configService.get<string>(
      AUTH_CONSTANTS.CONFIG.API_KEY,
    );
    if (!apiKey) {
      throw new Error(AUTH_CONSTANTS.ERROR_MESSAGES.MISSING_ENV_VAR);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isProtected = this.reflector.getAllAndOverride<boolean>(
      AUTH_CONSTANTS.METADATA.API_KEY_PROTECTED,
      [context.getHandler(), context.getClass()],
    );

    if (!isProtected) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.header(AUTH_CONSTANTS.HEADERS.API_KEY);
    const validApiKey = this.configService.get<string>(
      AUTH_CONSTANTS.CONFIG.API_KEY,
    );

    if (!validApiKey) {
      throw new Error(AUTH_CONSTANTS.ERROR_MESSAGES.MISSING_ENV_VAR);
    }

    if (!apiKey) {
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERROR_MESSAGES.MISSING_HEADER,
      );
    }
    if (apiKey !== validApiKey) {
      throw new UnauthorizedException(
        AUTH_CONSTANTS.ERROR_MESSAGES.INVALID_KEY,
      );
    }

    return true;
  }
}
