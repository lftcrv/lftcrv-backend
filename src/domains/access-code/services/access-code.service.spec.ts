import { Test, TestingModule } from '@nestjs/testing';
import { AccessCodeService } from './access-code.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AccessCodeTokens } from '../interfaces';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccessCodeType } from '../entities/access-code.entity';

describe('AccessCodeService', () => {
  let service: AccessCodeService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let codeGenerator: any;

  beforeEach(async () => {
    codeGenerator = {
      generateCode: jest.fn().mockReturnValue('123456'),
      hashCode: jest.fn().mockImplementation((code) => `hashed_${code}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessCodeService,
        {
          provide: PrismaService,
          useValue: {
            oTP: {
              createMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            failedAttempt: {
              count: jest.fn(),
              create: jest.fn(),
              deleteMany: jest.fn(),
            },
            elizaAgent: {
              findUnique: jest.fn(),
            },
            $executeRaw: jest.fn(),
            $queryRaw: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AccessCodeTokens.Generator,
          useValue: codeGenerator,
        },
      ],
    }).compile();

    service = module.get<AccessCodeService>(AccessCodeService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('generateCodes', () => {
    it('should generate the specified number of codes', async () => {
      const count = 3;
      const mockCodes = ['code1', 'code2', 'code3'];

      // Mock the code generator to return different codes
      codeGenerator.generateCode
        .mockReturnValueOnce('code1')
        .mockReturnValueOnce('code2')
        .mockReturnValueOnce('code3');

      codeGenerator.hashCode
        .mockReturnValueOnce('hashed_code1')
        .mockReturnValueOnce('hashed_code2')
        .mockReturnValueOnce('hashed_code3');

      const result = await service.generateCodes(count);

      expect(result).toEqual(mockCodes);
      expect(codeGenerator.generateCode).toHaveBeenCalledTimes(count);
      expect(codeGenerator.hashCode).toHaveBeenCalledTimes(count);
      expect(prismaService.oTP.createMany).toHaveBeenCalledWith({
        data: [
          { code: 'hashed_code1', used: false },
          { code: 'hashed_code2', used: false },
          { code: 'hashed_code3', used: false },
        ],
      });
    });
  });

  describe('verifyCode', () => {
    it('should throw BadRequestException when rate limit is exceeded', async () => {
      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce(10) // rateLimit
        .mockReturnValueOnce(60); // rateLimitWindow

      jest.spyOn(prismaService.failedAttempt, 'count').mockResolvedValue(10);

      await expect(service.verifyCode('123456', '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );

      expect(codeGenerator.hashCode).toHaveBeenCalledWith('127.0.0.1');
      expect(prismaService.failedAttempt.count).toHaveBeenCalled();
    });

    it('should throw BadRequestException when code is invalid', async () => {
      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce(10) // rateLimit
        .mockReturnValueOnce(60); // rateLimitWindow

      jest.spyOn(prismaService.failedAttempt, 'count').mockResolvedValue(5);
      jest.spyOn(prismaService.oTP, 'findFirst').mockResolvedValue(null);

      await expect(service.verifyCode('123456', '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaService.failedAttempt.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when code is already used', async () => {
      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce(10) // rateLimit
        .mockReturnValueOnce(60); // rateLimitWindow

      jest.spyOn(prismaService.failedAttempt, 'count').mockResolvedValue(5);
      jest.spyOn(prismaService.oTP, 'findFirst').mockResolvedValue({
        id: 'otp-id',
        code: 'hashed_123456',
        used: true,
        createdAt: new Date(),
        usedAt: new Date(),
      });

      await expect(service.verifyCode('123456', '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaService.failedAttempt.create).toHaveBeenCalled();
    });

    it('should verify code successfully', async () => {
      jest
        .spyOn(configService, 'get')
        .mockReturnValueOnce(10) // rateLimit
        .mockReturnValueOnce(60); // rateLimitWindow

      jest.spyOn(prismaService.failedAttempt, 'count').mockResolvedValue(5);
      jest.spyOn(prismaService.oTP, 'findFirst').mockResolvedValue({
        id: 'otp-id',
        code: 'hashed_123456',
        used: false,
        createdAt: new Date(),
        usedAt: null,
      });

      const result = await service.verifyCode('123456', '127.0.0.1');

      expect(result).toEqual({
        success: true,
        message: 'WAGMI 🚀',
      });

      expect(prismaService.oTP.update).toHaveBeenCalledWith({
        where: { id: 'otp-id' },
        data: {
          used: true,
          usedAt: expect.any(Date),
        },
      });

      expect(prismaService.failedAttempt.deleteMany).toHaveBeenCalled();
    });
  });

  describe('generateAccessCode', () => {
    it('should generate an access code successfully', async () => {
      const options = {
        type: AccessCodeType.ADMIN,
        maxUses: 5,
        expiresAt: new Date('2023-12-31'),
      };

      const mockCreatedCode = {
        id: 'code-id',
        code: 'access-code',
        type: 'ADMIN',
        max_uses: 5,
        expires_at: new Date('2023-12-31'),
        created_at: new Date(),
        is_active: true,
      };

      jest
        .spyOn(prismaService, '$queryRaw')
        .mockResolvedValue([mockCreatedCode]);

      const result = await service.generateAccessCode(options);

      expect(prismaService.$executeRaw).toHaveBeenCalled();
      expect(prismaService.$queryRaw).toHaveBeenCalled();
      expect(result).toEqual({
        id: mockCreatedCode.id,
        code: mockCreatedCode.code,
        type: mockCreatedCode.type,
        maxUses: mockCreatedCode.max_uses,
        expiresAt: mockCreatedCode.expires_at,
        createdAt: mockCreatedCode.created_at,
        isActive: mockCreatedCode.is_active,
      });
    });
  });

  describe('validateAccessCode', () => {
    it('should return invalid result when code does not exist', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);

      const result = await service.validateAccessCode(
        'invalid-code',
        'user-id',
      );

      expect(result).toEqual({
        isValid: false,
        error: 'INVALID_CODE',
      });
    });

    it('should return invalid result when code is inactive', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        {
          id: 'code-id',
          code: 'access-code',
          is_active: false,
        },
      ]);

      const result = await service.validateAccessCode('access-code', 'user-id');

      expect(result).toEqual({
        isValid: false,
        error: 'CODE_INACTIVE',
      });
    });

    it('should return invalid result when code is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday

      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        {
          id: 'code-id',
          code: 'access-code',
          is_active: true,
          expires_at: expiredDate,
        },
      ]);

      const result = await service.validateAccessCode('access-code', 'user-id');

      expect(result).toEqual({
        isValid: false,
        error: 'CODE_EXPIRED',
      });
    });

    it('should return invalid result when code has reached max uses', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        {
          id: 'code-id',
          code: 'access-code',
          is_active: true,
          max_uses: 5,
          current_uses: 5,
        },
      ]);

      const result = await service.validateAccessCode('access-code', 'user-id');

      expect(result).toEqual({
        isValid: false,
        error: 'CODE_MAX_USES_REACHED',
      });
    });

    it('should return invalid result when user is not found', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        {
          id: 'code-id',
          code: 'access-code',
          is_active: true,
          max_uses: 10,
          current_uses: 5,
        },
      ]);

      jest
        .spyOn(prismaService.elizaAgent, 'findUnique')
        .mockResolvedValue(null);

      const result = await service.validateAccessCode('access-code', 'user-id');

      expect(result).toEqual({
        isValid: false,
        error: 'USER_NOT_FOUND',
      });
    });

    it('should validate code successfully', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        {
          id: 'code-id',
          code: 'access-code',
          is_active: true,
          max_uses: 10,
          current_uses: 5,
          type: 'ADMIN',
        },
      ]);

      jest.spyOn(prismaService.elizaAgent, 'findUnique').mockResolvedValue({
        id: 'user-id',
      } as any);

      const result = await service.validateAccessCode('access-code', 'user-id');

      expect(prismaService.$executeRaw).toHaveBeenCalledTimes(2); // Update user and increment usage
      expect(result).toEqual({
        isValid: true,
        accessCode: {
          id: 'code-id',
          code: 'access-code',
          type: 'ADMIN',
          isActive: true,
          maxUses: 10,
          currentUses: 5,
        },
      });
    });
  });

  describe('getAccessCodeStatus', () => {
    it('should throw NotFoundException when code is not found', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);

      await expect(
        service.getAccessCodeStatus('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return access code status', async () => {
      const mockCode = {
        id: 'code-id',
        is_active: true,
        current_uses: 5,
        max_uses: 10,
        expires_at: new Date('2023-12-31'),
        type: 'ADMIN',
      };

      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([mockCode]);

      const result = await service.getAccessCodeStatus('code-id');

      expect(result).toEqual({
        id: mockCode.id,
        isActive: mockCode.is_active,
        currentUses: mockCode.current_uses,
        maxUses: mockCode.max_uses,
        expiresAt: mockCode.expires_at,
        type: mockCode.type,
      });
    });
  });

  describe('disableAccessCode', () => {
    it('should throw NotFoundException when code is not found', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([]);

      await expect(
        service.disableAccessCode('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should disable access code', async () => {
      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([
        {
          id: 'code-id',
        },
      ]);

      const result = await service.disableAccessCode('code-id');

      expect(prismaService.$executeRaw).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('getAccessCodeStats', () => {
    it('should return access code statistics', async () => {
      const mockStats = {
        total: '100',
        active: '80',
        used: '50',
        admin: '20',
        referral: '50',
        temporary: '30',
      };

      jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([mockStats]);

      const result = await service.getAccessCodeStats();

      expect(result).toEqual({
        totalCodes: 100,
        activeCodes: 80,
        usedCodes: 50,
        codesByType: {
          ADMIN: 20,
          REFERRAL: 50,
          TEMPORARY: 30,
        },
      });
    });
  });
});
