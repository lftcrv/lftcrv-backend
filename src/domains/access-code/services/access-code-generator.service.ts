import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IAccessCodeGenerator } from '../interfaces';

@Injectable()
export class AccessCodeGenerator implements IAccessCodeGenerator {
  generateCode(): string {
    const characters = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    return Array.from(
      { length: 6 },
      () => characters[Math.floor(Math.random() * characters.length)],
    ).join('');
  }

  hashCode(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
