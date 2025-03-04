export enum AccessCodeType {
  ADMIN = 'ADMIN',
  REFERRAL = 'REFERRAL',
  TEMPORARY = 'TEMPORARY',
}

export class AccessCode {
  id: string;
  code: string;
  createdAt: Date;
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
  createdBy?: string;
  isActive: boolean;
  type: AccessCodeType;
}

export class FailedAttempt {
  id: string;
  ipHash: string;
  codeHash: string;
  createdAt: Date;
}
