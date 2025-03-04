import { Injectable, OnModuleInit } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FileUploadService implements OnModuleInit {
  private readonly uploadDir = 'uploads/profile-pictures';
  private readonly tempDir = 'uploads/temp';

  async onModuleInit() {
    await this.createDirectories();
  }

  private async createDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  async uploadTempFile(file: Express.Multer.File): Promise<string> {
    if (!file) {
      console.log('⚠️ No file provided for upload');
      return null;
    }

    const fileExtension = path.extname(file.originalname);
    const tempFileName = `temp_${uuidv4()}${fileExtension}`;
    const tempFilePath = path.join(this.tempDir, tempFileName);

    try {
      console.log('📝 Writing temporary file:', {
        originalName: file.originalname,
        savingTo: tempFilePath,
        size: file.buffer.length,
      });

      await fs.writeFile(tempFilePath, file.buffer);
      console.log('✅ Temporary file written successfully:', tempFileName);
      return tempFileName;
    } catch (error) {
      console.error('❌ Failed to save temporary file:', {
        error: error.message,
        path: tempFilePath,
        originalName: file.originalname,
      });
      throw new Error('Failed to save temporary file');
    }
  }

  async moveToFinal(tempFileName: string, agentId: string): Promise<string> {
    if (!tempFileName || !agentId) {
      console.log('⚠️ Missing tempFileName or agentId for file move');
      return null;
    }

    const fileExtension = path.extname(tempFileName);
    const finalFileName = `${agentId}${fileExtension}`;
    const tempFilePath = path.join(this.tempDir, tempFileName);
    const finalFilePath = path.join(this.uploadDir, finalFileName);

    try {
      console.log('🔄 Moving file to final location:', {
        from: tempFilePath,
        to: finalFilePath,
      });

      await fs.rename(tempFilePath, finalFilePath);
      console.log('✅ File moved successfully:', finalFileName);
      return finalFileName;
    } catch (error) {
      console.error('❌ Failed to move file:', {
        error: error.message,
        tempPath: tempFilePath,
        finalPath: finalFilePath,
      });
      throw new Error('Failed to move file to final location');
    }
  }

  async deleteFile(fileName: string, isTemp: boolean = false): Promise<void> {
    if (!fileName) {
      console.log('⚠️ No filename provided for deletion');
      return;
    }

    try {
      const directory = isTemp ? this.tempDir : this.uploadDir;
      const filePath = path.join(directory, fileName);
      console.log('🗑️ Deleting file:', filePath);
      await fs.unlink(filePath);
      console.log('✅ File deleted successfully:', fileName);
    } catch (error) {
      console.error('❌ Failed to delete file:', {
        error: error.message,
        fileName,
      });
    }
  }

  async cleanupTempFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      for (const file of files) {
        await this.deleteFile(file, true);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup temp files:', error);
    }
  }
}
