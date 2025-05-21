import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { ApiKeyGuard } from '../guards/api-key.guard';

export const RequireApiKey = () => {
  return applyDecorators(
    SetMetadata(AUTH_CONSTANTS.METADATA.API_KEY_PROTECTED, true),
    UseGuards(ApiKeyGuard),
    ApiHeader(AUTH_CONSTANTS.SWAGGER.API_KEY_HEADER),
    ApiUnauthorizedResponse(AUTH_CONSTANTS.SWAGGER.UNAUTHORIZED_RESPONSE),
    ApiSecurity('api-key'),
  );
};
