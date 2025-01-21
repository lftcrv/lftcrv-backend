-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('STARTING', 'RUNNING', 'STOPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "CurveSide" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "OrchestrationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

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

-- CreateTable
CREATE TABLE "latest_market_data" (
    "id" TEXT NOT NULL,
    "elizaAgentId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceChange24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "holders" INTEGER NOT NULL DEFAULT 0,
    "marketCap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "latest_market_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orchestrations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "OrchestrationStatus" NOT NULL,
    "currentStepId" TEXT NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orchestrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_wallet" (
    "id" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "fundTransactionHash" TEXT,
    "deployTransactionHash" TEXT,
    "deployedAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "elizaAgentId" TEXT NOT NULL,

    CONSTRAINT "agent_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OTP_code_key" ON "OTP"("code");

-- CreateIndex
CREATE INDEX "OTP_code_idx" ON "OTP"("code");

-- CreateIndex
CREATE INDEX "FailedAttempt_createdAt_idx" ON "FailedAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "FailedAttempt_codeHash_idx" ON "FailedAttempt"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "latest_market_data_elizaAgentId_key" ON "latest_market_data"("elizaAgentId");

-- CreateIndex
CREATE INDEX "latest_market_data_price_idx" ON "latest_market_data"("price");

-- CreateIndex
CREATE INDEX "latest_market_data_priceChange24h_idx" ON "latest_market_data"("priceChange24h");

-- CreateIndex
CREATE INDEX "latest_market_data_holders_idx" ON "latest_market_data"("holders");

-- CreateIndex
CREATE INDEX "latest_market_data_marketCap_idx" ON "latest_market_data"("marketCap");

-- CreateIndex
CREATE INDEX "orchestrations_type_idx" ON "orchestrations"("type");

-- CreateIndex
CREATE INDEX "orchestrations_status_idx" ON "orchestrations"("status");

-- CreateIndex
CREATE INDEX "orchestrations_createdAt_idx" ON "orchestrations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_wallet_elizaAgentId_key" ON "agent_wallet"("elizaAgentId");

-- AddForeignKey
ALTER TABLE "trading_information" ADD CONSTRAINT "trading_information_elizaAgentId_fkey" FOREIGN KEY ("elizaAgentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "latest_market_data" ADD CONSTRAINT "latest_market_data_elizaAgentId_fkey" FOREIGN KEY ("elizaAgentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_wallet" ADD CONSTRAINT "agent_wallet_elizaAgentId_fkey" FOREIGN KEY ("elizaAgentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
