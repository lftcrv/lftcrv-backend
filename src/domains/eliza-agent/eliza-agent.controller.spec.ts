import { Test, TestingModule } from '@nestjs/testing';
import { ElizaAgentController } from './eliza-agent.controller';
import { FileUploadService } from './services/file-upload.service';
import { ServiceTokens } from './interfaces';
import { OrchestrationServiceTokens } from '../orchestration/interfaces';
import { InternalServerErrorException } from '@nestjs/common';
import { CurveSide } from '@prisma/client';
import { ConfigModule, ConfigService } from '@nestjs/config';

describe('ElizaAgentController', () => {
  let controller: ElizaAgentController;
  let fileUploadService: FileUploadService;

  const mockQueryService = {
    getAgent: jest.fn(),
    listAgents: jest.fn(),
    listRunningAgents: jest.fn(),
    listLatestAgents: jest.fn(),
    searchAgents: jest.fn(),
  };

  const mockLifecycleService = {
    startAgent: jest.fn(),
    stopAgent: jest.fn(),
  };

  const mockOrchestrator = {
    startOrchestration: jest.fn(),
    getOrchestrationStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      controllers: [ElizaAgentController],
      providers: [
        {
          provide: ServiceTokens.ElizaAgentQuery,
          useValue: mockQueryService,
        },
        {
          provide: ServiceTokens.ElizaAgentLifecycle,
          useValue: mockLifecycleService,
        },
        {
          provide: OrchestrationServiceTokens.Orchestrator,
          useValue: mockOrchestrator,
        },
        {
          provide: FileUploadService,
          useValue: {
            uploadTempFile: jest.fn(),
            moveToFinal: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        ConfigService,
      ],
    }).compile();

    controller = module.get<ElizaAgentController>(ElizaAgentController);
    fileUploadService = module.get<FileUploadService>(FileUploadService);
  });

  describe('createAgent', () => {
    const mockDto = {
      name: 'Test Agent',
      curveSide: CurveSide.LEFT,
      creatorWallet: '0x123',
      transactionHash: '0xabc',
      characterConfig: { key: 'value' },
    };

    it('should handle agent creation without profile picture', async () => {
      const mockOrchestrationId = 'orch-123';
      mockOrchestrator.startOrchestration.mockResolvedValueOnce(
        mockOrchestrationId,
      );

      const result = await controller.createAgent(mockDto, undefined);

      expect(result).toEqual({
        status: 'success',
        data: {
          orchestrationId: mockOrchestrationId,
          message: 'Agent creation initiated successfully',
        },
      });
      expect(fileUploadService.uploadTempFile).not.toHaveBeenCalled();
    });

    it('should handle agent creation with profile picture', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const mockFileName = 'uploaded-file.jpg';
      const mockOrchestrationId = 'orch-123';

      (fileUploadService.uploadTempFile as jest.Mock).mockResolvedValueOnce(
        mockFileName,
      );
      mockOrchestrator.startOrchestration.mockResolvedValueOnce(
        mockOrchestrationId,
      );

      const result = await controller.createAgent(mockDto, mockFile);

      expect(fileUploadService.uploadTempFile).toHaveBeenCalledWith(mockFile);
      expect(mockOrchestrator.startOrchestration).toHaveBeenCalledWith(
        expect.any(String),
        mockDto,
      );
      expect(result.status).toBe('success');
    });

    it('should clean up uploaded file if orchestration fails', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const mockFileName = 'uploaded-file.jpg';
      const mockError = new Error('Orchestration failed');

      (fileUploadService.uploadTempFile as jest.Mock).mockResolvedValueOnce(
        mockFileName,
      );
      mockOrchestrator.startOrchestration.mockRejectedValueOnce(mockError);

      await expect(controller.createAgent(mockDto, mockFile)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(fileUploadService.deleteFile).toHaveBeenCalledWith(mockFileName);
    });
  });
});
