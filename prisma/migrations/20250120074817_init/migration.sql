-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('STARTING', 'RUNNING', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "CurveSide" AS ENUM ('LEFT', 'RIGHT');

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

-- CreateTable
CREATE TABLE "eliza_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "curveSide" "CurveSide" NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'STARTING',
    "containerId" TEXT,
    "runtimeAgentId" TEXT,
    "port" INTEGER,
    "characterConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "degenScore" DOUBLE PRECISION DEFAULT 0,
    "winScore" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "eliza_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_information" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elizaAgentId" TEXT NOT NULL,
    "information" JSONB NOT NULL,

    CONSTRAINT "trading_information_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OTP_code_key" ON "OTP"("code");

-- CreateIndex
CREATE INDEX "OTP_code_idx" ON "OTP"("code");

-- CreateIndex
CREATE INDEX "FailedAttempt_createdAt_idx" ON "FailedAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "FailedAttempt_codeHash_idx" ON "FailedAttempt"("codeHash");

-- AddForeignKey
ALTER TABLE "trading_information" ADD CONSTRAINT "trading_information_elizaAgentId_fkey" FOREIGN KEY ("elizaAgentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
