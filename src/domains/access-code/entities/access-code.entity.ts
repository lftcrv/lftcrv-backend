export class AccessCode {
  id: string;
  code: string;
  used: boolean;
  usedAt?: Date;
  createdAt: Date;
}

export class FailedAttempt {
  id: string;
  ipHash: string;
  codeHash: string;
  createdAt: Date;
}
