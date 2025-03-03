// Access Code Generator Interface
export interface IAccessCodeGenerator {
  generateCode(): string;
  hashCode(code: string): string;
}

// Access Code Metrics Interface
export interface IAccessCodeMetricsService {
  getMetrics(): Promise<AccessCodeMetrics>;
}

export interface AccessCodeMetrics {
  totalCodes: number;
  usedCodes: number;
  unusedCodes: number;
  usageRate: number;
  averageTimeToUse?: number;
}

// Access Code Service Interface
export interface IAccessCodeService {
  generateCodes(count: number): Promise<string[]>;
  verifyCode(code: string, clientIp: string): Promise<VerificationResult>;

  // New methods for the gated access system
  generateAccessCode(
    options: GenerateAccessCodeOptions,
  ): Promise<AccessCodeResponse | BatchAccessCodeResponse>;
  validateAccessCode(code: string, userId: string): Promise<ValidationResult>;
  getAccessCodeStatus(codeId: string): Promise<AccessCodeStatus>;
  disableAccessCode(codeId: string): Promise<boolean>;
  getAccessCodeStats(): Promise<AccessCodeStats>;
  listAllAccessCodes(): Promise<AccessCodeResponse[]>;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
}

// New interfaces for the gated access system
export interface GenerateAccessCodeOptions {
  type: 'ADMIN' | 'REFERRAL' | 'TEMPORARY';
  maxUses?: number;
  expiresAt?: Date;
  createdBy?: string;
  useShortCode?: boolean;
  description?: string;
  count?: number;
}

export interface AccessCodeResponse {
  id: string;
  code: string;
  type: string;
  maxUses?: number;
  currentUses?: number;
  expiresAt?: Date;
  createdAt: Date;
  isActive: boolean;
  description?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  accessCode?: AccessCodeResponse;
}

export interface AccessCodeStatus {
  id: string;
  isActive: boolean;
  currentUses: number;
  maxUses?: number;
  expiresAt?: Date;
  type: string;
  description?: string;
}

export interface AccessCodeStats {
  totalCodes: number;
  activeCodes: number;
  usedCodes: number;
  codesByType: Record<string, number>;
}

export interface BatchAccessCodeResponse {
  accessCodes: AccessCodeResponse[];
}

// Tokens for dependency injection
export const AccessCodeTokens = {
  Service: 'ACCESS_CODE_SERVICE',
  Generator: 'ACCESS_CODE_GENERATOR',
  Metrics: 'ACCESS_CODE_METRICS',
};
