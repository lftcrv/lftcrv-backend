import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadService } from './file-upload.service';
import { promises as fs } from 'fs';
import * as path from 'path';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

describe('FileUploadService', () => {
  let service: FileUploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileUploadService],
    }).compile();

    service = module.get(FileUploadService);
    jest.clearAllMocks();
    await service.onModuleInit();
  });

  it('should create upload directory on initialization', async () => {
    expect(fs.mkdir).toHaveBeenCalledWith('uploads/profile-pictures', {
      recursive: true,
    });
  });

  describe('uploadFile', () => {
    it('should return null if no file provided', async () => {
      const result = await service.uploadFile(null);
      expect(result).toBeNull();
    });

    it('should save file and return filename', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const result = await service.uploadFile(mockFile);

      expect(result).toMatch(/^[a-f0-9-]+\.jpg$/); // UUID format with jpg extension
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('uploads/profile-pictures/'),
        mockFile.buffer,
      );
    });

    it('should handle file save errors', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      (fs.writeFile as jest.Mock).mockRejectedValueOnce(
        new Error('Save failed'),
      );

      await expect(service.uploadFile(mockFile)).rejects.toThrow(
        'Failed to save file',
      );
    });
  });

  describe('deleteFile', () => {
    it('should not attempt deletion if filename is null', async () => {
      await service.deleteFile(null);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should delete file if filename provided', async () => {
      const filename = 'test.jpg';
      await service.deleteFile(filename);

      expect(fs.unlink).toHaveBeenCalledWith(
        path.join('uploads/profile-pictures', filename),
      );
    });

    it('should handle deletion errors gracefully', async () => {
      (fs.unlink as jest.Mock).mockRejectedValueOnce(
        new Error('Delete failed'),
      );

      // Should not throw error
      await expect(service.deleteFile('test.jpg')).resolves.not.toThrow();
    });
  });
});
