export interface IAccessCodeService {
  generateCodes(count: number): Promise<string[]>;
  verifyCode(code: string, clientIp: string): Promise<VerificationResult>;
}

export interface VerificationResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
}
