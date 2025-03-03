import { Test, TestingModule } from '@nestjs/testing';
import {
  RequireAccessCodeMiddleware,
  isAccessCodeSystemEnabled,
  hasValidAccessCode,
} from './access-code.middleware';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AccessCodeTokens } from '../interfaces';
import { Request, Response } from 'express';

describe('AccessCodeMiddleware', () => {
  let middleware: RequireAccessCodeMiddleware;
  let configService: ConfigService;
  let prismaService: PrismaService;
  let accessCodeService: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(async () => {
    accessCodeService = {
      validateAccessCode: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequireAccessCodeMiddleware,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            elizaAgent: {
              findUnique: jest.fn(),
            },
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: AccessCodeTokens.Service,
          useValue: accessCodeService,
        },
      ],
    }).compile();

    middleware = module.get<RequireAccessCodeMiddleware>(
      RequireAccessCodeMiddleware,
    );
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);

    mockRequest = {
      user: {
        id: 'user-id',
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  describe('use', () => {
    it('should call next() when access code system is disabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(false);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(configService.get).toHaveBeenCalledWith(
        'ACCESS_CODE_SYSTEM_ENABLED',
        false,
      );
      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(true);
      mockRequest.user = undefined;

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(true);
      jest
        .spyOn(prismaService.elizaAgent, 'findUnique')
        .mockResolvedValue(null);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(prismaService.elizaAgent.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'UNAUTHORIZED',
        message: 'User not found',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when user has no access code', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(true);
      jest.spyOn(prismaService.elizaAgent, 'findUnique').mockResolvedValue({
        id: 'user-id',
        name: 'Test User',
      } as any);
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValue([{ access_code_id: null }]);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'ACCESS_CODE_REQUIRED',
        message: 'Valid access code required',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when access code is inactive', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(true);
      jest.spyOn(prismaService.elizaAgent, 'findUnique').mockResolvedValue({
        id: 'user-id',
        name: 'Test User',
      } as any);

      // Mock user with access code
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([{ access_code_id: 'access-code-id' }])
        // Mock access code that is inactive
        .mockResolvedValueOnce([
          {
            id: 'access-code-id',
            is_active: false,
          },
        ]);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'ACCESS_CODE_INACTIVE',
        message: 'Access code is not active',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 when access code is expired', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(true);
      jest.spyOn(prismaService.elizaAgent, 'findUnique').mockResolvedValue({
        id: 'user-id',
        name: 'Test User',
      } as any);

      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      // Mock user with access code
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([{ access_code_id: 'access-code-id' }])
        // Mock access code that is expired
        .mockResolvedValueOnce([
          {
            id: 'access-code-id',
            is_active: true,
            expires_at: expiredDate,
          },
        ]);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'ACCESS_CODE_EXPIRED',
        message: 'Access code has expired',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() when user has valid access code', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(true);
      jest.spyOn(prismaService.elizaAgent, 'findUnique').mockResolvedValue({
        id: 'user-id',
        name: 'Test User',
      } as any);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      // Mock user with access code
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([{ access_code_id: 'access-code-id' }])
        // Mock valid access code
        .mockResolvedValueOnce([
          {
            id: 'access-code-id',
            is_active: true,
            expires_at: futureDate,
          },
        ]);

      await middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('isAccessCodeSystemEnabled', () => {
    it('should return true when system is enabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue(true);

      const result = isAccessCodeSystemEnabled(configService);

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith(
        'ACCESS_CODE_SYSTEM_ENABLED',
        false,
      );
    });

    it('should return false when system is disabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue(false);

      const result = isAccessCodeSystemEnabled(configService);

      expect(result).toBe(false);
      expect(configService.get).toHaveBeenCalledWith(
        'ACCESS_CODE_SYSTEM_ENABLED',
        false,
      );
    });
  });

  describe('hasValidAccessCode', () => {
    it('should return false when user is null', async () => {
      const result = await hasValidAccessCode(null, prismaService);

      expect(result).toBe(false);
      expect(prismaService.$queryRaw).not.toHaveBeenCalled();
    });

    it('should return false when user has no access code', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValue([{ access_code_id: null }]);

      const result = await hasValidAccessCode(
        { id: 'user-id' } as any,
        prismaService,
      );

      expect(result).toBe(false);
    });

    it('should return false when access code is inactive', async () => {
      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([{ access_code_id: 'access-code-id' }])
        .mockResolvedValueOnce([
          {
            id: 'access-code-id',
            is_active: false,
          },
        ]);

      const result = await hasValidAccessCode(
        { id: 'user-id' } as any,
        prismaService,
      );

      expect(result).toBe(false);
    });

    it('should return false when access code is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([{ access_code_id: 'access-code-id' }])
        .mockResolvedValueOnce([
          {
            id: 'access-code-id',
            is_active: true,
            expires_at: expiredDate,
          },
        ]);

      const result = await hasValidAccessCode(
        { id: 'user-id' } as any,
        prismaService,
      );

      expect(result).toBe(false);
    });

    it('should return true when access code is valid', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValueOnce([{ access_code_id: 'access-code-id' }])
        .mockResolvedValueOnce([
          {
            id: 'access-code-id',
            is_active: true,
            expires_at: futureDate,
          },
        ]);

      const result = await hasValidAccessCode(
        { id: 'user-id' } as any,
        prismaService,
      );

      expect(result).toBe(true);
    });
  });
});
