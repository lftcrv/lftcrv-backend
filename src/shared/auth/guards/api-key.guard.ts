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
      AUTH_CONSTANTS.CONFIG.BACKEND_API_KEY,
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
    // Try to get the API key from x-api-key header (official header)
    let apiKey = request.header(AUTH_CONSTANTS.HEADERS.BACKEND_API_KEY);
    
    // If not found, try api-key header (compatibility)
    if (!apiKey) {
      apiKey = request.header('api-key');
    }

    const validApiKey = this.configService.get<string>(
      AUTH_CONSTANTS.CONFIG.BACKEND_API_KEY,
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
