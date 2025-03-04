import { Test, TestingModule } from '@nestjs/testing';
import { AccessCodeController } from './access-code.controller';
import { AccessCodeTokens } from './interfaces';
import { BadRequestException } from '@nestjs/common';
import { AccessCodeType } from './entities/access-code.entity';

// Mock the LoggingInterceptor
jest.mock('../../shared/interceptors/logging.interceptor', () => ({
  LoggingInterceptor: jest.fn().mockImplementation(() => ({
    intercept: jest.fn().mockImplementation((context, next) => next.handle()),
  })),
}));

// Mock the RequireApiKey decorator
jest.mock('../../shared/auth/decorators/require-api-key.decorator', () => ({
  RequireApiKey: () => jest.fn(),
}));

describe('AccessCodeController', () => {
  let controller: AccessCodeController;
  let accessCodeService: any;
  let metricsService: any;

  beforeEach(async () => {
    // Create mock services
    accessCodeService = {
      generateCodes: jest.fn(),
      verifyCode: jest.fn(),
      generateAccessCode: jest.fn(),
      validateAccessCode: jest.fn(),
      getAccessCodeStatus: jest.fn(),
      disableAccessCode: jest.fn(),
      getAccessCodeStats: jest.fn(),
    };

    metricsService = {
      getMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccessCodeController],
      providers: [
        {
          provide: AccessCodeTokens.Service,
          useValue: accessCodeService,
        },
        {
          provide: AccessCodeTokens.Metrics,
          useValue: metricsService,
        },
      ],
    }).compile();

    controller = module.get<AccessCodeController>(AccessCodeController);
  });

  describe('generateCodes', () => {
    it('should throw BadRequestException when count is less than 1', async () => {
      await expect(controller.generateCodes({ count: 0 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when count is greater than 100', async () => {
      await expect(controller.generateCodes({ count: 101 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate codes successfully', async () => {
      const mockCodes = ['code1', 'code2', 'code3'];
      accessCodeService.generateCodes.mockResolvedValue(mockCodes);

      const result = await controller.generateCodes({ count: 3 });

      expect(accessCodeService.generateCodes).toHaveBeenCalledWith(3);
      expect(result).toEqual({
        status: 'success',
        data: { codes: mockCodes },
      });
    });
  });

  describe('verifyCode', () => {
    it('should verify code successfully', async () => {
      const mockResult = { success: true, message: 'WAGMI 🚀' };
      accessCodeService.verifyCode.mockResolvedValue(mockResult);

      const result = await controller.verifyCode(
        { code: '123456' },
        '127.0.0.1',
      );

      expect(accessCodeService.verifyCode).toHaveBeenCalledWith(
        '123456',
        '127.0.0.1',
      );
      expect(result).toEqual({
        status: 'success',
        ...mockResult,
      });
    });
  });

  describe('getMetrics', () => {
    it('should return metrics successfully', async () => {
      const mockMetrics = {
        totalCodes: 100,
        usedCodes: 50,
        unusedCodes: 50,
        usageRate: 0.5,
      };
      metricsService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getMetrics();

      expect(metricsService.getMetrics).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'success',
        data: { metrics: mockMetrics },
      });
    });
  });

  describe('generateAccessCode', () => {
    it('should generate access code successfully', async () => {
      const mockDto = {
        type: AccessCodeType.ADMIN,
        maxUses: 5,
        expiresAt: new Date(),
      };
      const mockAccessCode = {
        id: 'code-id',
        code: 'access-code',
        type: AccessCodeType.ADMIN,
        maxUses: 5,
        expiresAt: new Date(),
        createdAt: new Date(),
        isActive: true,
      };
      accessCodeService.generateAccessCode.mockResolvedValue(mockAccessCode);

      const result = await controller.generateAccessCode(mockDto);

      expect(accessCodeService.generateAccessCode).toHaveBeenCalledWith(
        mockDto,
      );
      expect(result).toEqual({
        status: 'success',
        data: { accessCode: mockAccessCode },
      });
    });
  });

  describe('validateAccessCode', () => {
    it('should validate access code successfully', async () => {
      const mockDto = {
        code: 'access-code',
        userId: 'user-id',
      };
      const mockResult = {
        isValid: true,
      };
      accessCodeService.validateAccessCode.mockResolvedValue(mockResult);

      const result = await controller.validateAccessCode(mockDto);

      expect(accessCodeService.validateAccessCode).toHaveBeenCalledWith(
        mockDto.code,
        mockDto.userId,
      );
      expect(result).toEqual({
        status: 'success',
        data: { result: mockResult },
      });
    });
  });

  describe('getAccessCodeStatus', () => {
    it('should get access code status successfully', async () => {
      const mockStatus = {
        id: 'code-id',
        isActive: true,
        currentUses: 3,
        maxUses: 5,
        type: AccessCodeType.ADMIN,
      };
      accessCodeService.getAccessCodeStatus.mockResolvedValue(mockStatus);

      const result = await controller.getAccessCodeStatus({ id: 'code-id' });

      expect(accessCodeService.getAccessCodeStatus).toHaveBeenCalledWith(
        'code-id',
      );
      expect(result).toEqual({
        status: 'success',
        data: { status: mockStatus },
      });
    });
  });

  describe('disableAccessCode', () => {
    it('should disable access code successfully', async () => {
      accessCodeService.disableAccessCode.mockResolvedValue(true);

      const result = await controller.disableAccessCode({ id: 'code-id' });

      expect(accessCodeService.disableAccessCode).toHaveBeenCalledWith(
        'code-id',
      );
      expect(result).toEqual({
        status: 'success',
        data: { disabled: true },
      });
    });
  });

  describe('getAccessCodeStats', () => {
    it('should get access code stats successfully', async () => {
      const mockStats = {
        totalCodes: 100,
        activeCodes: 80,
        usedCodes: 50,
        codesByType: {
          ADMIN: 20,
          REFERRAL: 50,
          TEMPORARY: 30,
        },
      };
      accessCodeService.getAccessCodeStats.mockResolvedValue(mockStats);

      const result = await controller.getAccessCodeStats();

      expect(accessCodeService.getAccessCodeStats).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'success',
        data: { stats: mockStats },
      });
    });
  });
});
