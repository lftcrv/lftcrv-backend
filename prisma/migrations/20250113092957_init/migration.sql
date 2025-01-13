-- CreateTable
CREATE TABLE "OTP" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailedAttempt" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FailedAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OTP_code_key" ON "OTP"("code");

-- CreateIndex
CREATE INDEX "OTP_code_idx" ON "OTP"("code");

-- CreateIndex
CREATE INDEX "OTP_used_idx" ON "OTP"("used");

-- CreateIndex
CREATE INDEX "FailedAttempt_createdAt_idx" ON "FailedAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "FailedAttempt_codeHash_idx" ON "FailedAttempt"("codeHash");
