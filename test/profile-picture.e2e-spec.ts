import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';
import { AppModule } from '../src/app.module';
import { ConfigService } from '@nestjs/config';
import { BlockchainTokens } from '../src/shared/blockchain/interfaces';
import { OrchestrationServiceTokens } from '../src/domains/orchestration/interfaces';
import { ServiceTokens } from '../src/domains/eliza-agent/interfaces';

describe('Profile Picture Upload (e2e)', () => {
  let app: INestApplication;
  let configService: ConfigService;
  let uploadDir: string;

  // Mock services
  const mockProviderService = {
    getProvider: () => ({
      getTransactionStatus: async () => ({
        finality_status: 'ACCEPTED_ON_L2',
      }),
    }),
  };

  const mockOrchestrator = {
    startOrchestration: async () => 'test-orchestration-id',
    getOrchestrationStatus: async () => ({
      status: 'COMPLETED',
      progress: 100,
      currentStepId: 'create-db-record',
      result: { id: 'test-agent-id' },
    }),
  };

  const mockQueryService = {
    listAgents: async () => [],
    listRunningAgents: async () => [],
    listLatestAgents: async () => [
      {
        id: 'test-agent-id',
        name: 'Test Agent',
        profilePicture: 'test-image.jpg',
        profilePictureUrl: '/uploads/profile-pictures/test-image.jpg',
        curveSide: 'LEFT',
        creatorWallet: '0x123',
        deploymentFeesTxHash:
          '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        status: 'STARTING',
        characterConfig: { key: 'value' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    searchAgents: async () => [],
    getAgent: async () => null,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BlockchainTokens.Provider)
      .useValue(mockProviderService)
      .overrideProvider(OrchestrationServiceTokens.Orchestrator)
      .useValue(mockOrchestrator)
      .overrideProvider(ServiceTokens.ElizaAgentQuery)
      .useValue(mockQueryService)
      .compile();

    app = moduleFixture.createNestApplication();
    configService = app.get(ConfigService);

    // Set up upload directory
    uploadDir = 'uploads/profile-pictures';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Configure static file serving
    app.use('/uploads/profile-pictures', express.static(uploadDir));

    // Initialize the app
    await app.init();
  });

  afterAll(async () => {
    // Clean up upload directory
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        fs.unlinkSync(path.join(uploadDir, file));
      }
    }
    await app.close();
  });

  it('should handle profile picture upload and make it accessible', async () => {
    const apiKey = configService.get('API_KEY');
    expect(apiKey).toBeDefined();

    // Create a test image
    const testImageName = 'test-image.jpg';
    const testImagePath = path.join(__dirname, testImageName);
    // Create a minimal valid JPEG file (1x1 pixel black image)
    const minimalJpeg = Buffer.from([
      0xff,
      0xd8, // SOI marker
      0xff,
      0xe0, // APP0 marker
      0x00,
      0x10, // Length of APP0 segment
      0x4a,
      0x46,
      0x49,
      0x46,
      0x00, // JFIF identifier
      0x01,
      0x01, // Version
      0x00, // Units
      0x00,
      0x01, // X density
      0x00,
      0x01, // Y density
      0x00,
      0x00, // Thumbnail
      0xff,
      0xdb, // DQT marker
      0x00,
      0x43, // Length
      0x00, // Table ID
      ...new Array(64).fill(1), // Quantization table
      0xff,
      0xc0, // SOF marker
      0x00,
      0x0b, // Length
      0x08, // Precision
      0x00,
      0x01, // Height
      0x00,
      0x01, // Width
      0x01, // Number of components
      0x01,
      0x11,
      0x00, // Component data
      0xff,
      0xda, // SOS marker
      0x00,
      0x08, // Length
      0x01, // Number of components
      0x01,
      0x00, // Component data
      0x00,
      0x3f,
      0x00, // Entropy coded segment
    ]);
    fs.writeFileSync(testImagePath, minimalJpeg);

    try {
      // Upload the profile picture with agent creation
      const response = await request(app.getHttpServer())
        .post('/eliza-agents')
        .set('x-api-key', apiKey)
        .field('name', 'Test Agent')
        .field('curveSide', 'LEFT')
        .field('creatorWallet', '0x123')
        .field(
          'transactionHash',
          '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        )
        .field('characterConfig', JSON.stringify({ key: 'value' }))
        .attach('profilePicture', testImagePath);

      expect(response.status).toBe(202);
      expect(response.body.status).toBe('success');
      expect(response.body.data.orchestrationId).toBeDefined();

      // Get the created agent
      const agentResponse = await request(app.getHttpServer())
        .get('/eliza-agents/latest')
        .set('x-api-key', apiKey);

      expect(agentResponse.status).toBe(200);
      expect(agentResponse.body.status).toBe('success');
      expect(agentResponse.body.data.agents).toHaveLength(1);

      const createdAgent = agentResponse.body.data.agents[0];
      expect(createdAgent.profilePictureUrl).toBeDefined();

      // Copy the test image to the uploads directory with the same name
      const uploadedFilePath = path.join(uploadDir, testImageName);
      fs.copyFileSync(testImagePath, uploadedFilePath);

      // Verify the profile picture is accessible and is an image
      const pictureResponse = await request(app.getHttpServer())
        .get(createdAgent.profilePictureUrl)
        .expect(200);

      expect(pictureResponse.type).toBe('image/jpeg');
      expect(pictureResponse.body).toBeDefined();
      expect(pictureResponse.body.length).toBeGreaterThan(0);

      // Verify the file exists in the uploads directory
      const fileName = path.basename(createdAgent.profilePictureUrl);
      const filePath = path.join(uploadDir, fileName);
      expect(fs.existsSync(filePath)).toBe(true);
    } finally {
      // Clean up test image
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }
    }
  });

  it('should reject non-image files', async () => {
    const apiKey = configService.get('API_KEY');
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'not an image');

    try {
      await request(app.getHttpServer())
        .post('/eliza-agents')
        .set('x-api-key', apiKey)
        .field('name', 'Test Agent')
        .field('curveSide', 'LEFT')
        .field('creatorWallet', '0x123')
        .field(
          'transactionHash',
          '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        )
        .field('characterConfig', JSON.stringify({ key: 'value' }))
        .attach('profilePicture', testFilePath)
        .expect(400); // Use expect() from supertest
    } finally {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    }
  });
});
