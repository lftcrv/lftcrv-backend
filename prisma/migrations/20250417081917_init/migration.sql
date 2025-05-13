-- CreateEnum
CREATE TYPE "WalletAddressType" AS ENUM ('NATIVE', 'DERIVED');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('STARTING', 'RUNNING', 'STOPPED', 'FAILED', 'ERROR');

-- CreateEnum
CREATE TYPE "CurveSide" AS ENUM ('LEFT', 'RIGHT');

-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('TECHNICAL', 'SENTIMENT', 'MARKET', 'OVERALL');

-- CreateEnum
CREATE TYPE "OrchestrationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BondingStatus" AS ENUM ('BONDING', 'LIVE');

-- CreateEnum
CREATE TYPE "AccessCodeType" AS ENUM ('ADMIN', 'REFERRAL', 'TEMPORARY');

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
CREATE TABLE "access_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" "AccessCodeType" NOT NULL,
    "description" TEXT,

    CONSTRAINT "access_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "latest_market_data" (
    "id" TEXT NOT NULL,
    "elizaAgentId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceChange24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "holders" INTEGER NOT NULL DEFAULT 0,
    "marketCap" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bondingStatus" "BondingStatus" NOT NULL DEFAULT 'BONDING',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "forkCount" INTEGER NOT NULL DEFAULT 0,
    "pnlCycle" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnl24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "tvl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceInUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnlRank" INTEGER,

    CONSTRAINT "latest_market_data_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "paradex_markets" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "assetKind" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "positionLimit" TEXT NOT NULL,
    "minNotional" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paradex_markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orchestrations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "OrchestrationStatus" NOT NULL,
    "currentStepId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orchestrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "type" "AnalysisType" NOT NULL,
    "data" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eliza_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "curveSide" "CurveSide" NOT NULL,
    "creatorWallet" TEXT NOT NULL,
    "deployment_fees_tx_hash" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'STARTING',
    "failureReason" TEXT,
    "containerId" TEXT,
    "runtimeAgentId" TEXT,
    "port" INTEGER,
    "characterConfig" JSONB NOT NULL,
    "profilePicture" TEXT,
    "degenScore" DOUBLE PRECISION DEFAULT 0,
    "winScore" DOUBLE PRECISION DEFAULT 0,
    "selected_cryptos" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accessCodeId" TEXT,
    "accessGrantedAt" TIMESTAMP(3),
    "forkedFromId" TEXT,

    CONSTRAINT "eliza_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_information" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "information" JSONB NOT NULL,
    "elizaAgentId" TEXT NOT NULL,

    CONSTRAINT "trading_information_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_wallet" (
    "id" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "ethPrivateKey" TEXT NOT NULL,
    "ethAccountAddress" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "fundTransactionHash" TEXT,
    "deployTransactionHash" TEXT,
    "deployedAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "elizaAgentId" TEXT NOT NULL,

    CONSTRAINT "agent_wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_token" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "buyTax" INTEGER NOT NULL,
    "sellTax" INTEGER NOT NULL,
    "elizaAgentId" TEXT NOT NULL,

    CONSTRAINT "agent_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "buyToken" TEXT NOT NULL,
    "sellToken" TEXT NOT NULL,
    "buyAmount" BIGINT NOT NULL,
    "sellAmount" BIGINT NOT NULL,
    "hash" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tokenId" TEXT NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_for_token" (
    "id" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "tokenId" TEXT NOT NULL,

    CONSTRAINT "price_for_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_token_balances" (
    "id" TEXT NOT NULL,
    "account_balance_id" TEXT NOT NULL,
    "token_symbol" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "price_usd" DECIMAL(18,8) NOT NULL,
    "value_usd" DECIMAL(18,8) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_token_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paradex_account_balances" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "balanceInUSD" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paradex_account_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_performance_snapshots" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balanceInUSD" DOUBLE PRECISION NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnlPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnl24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pnlCycle" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "tvl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marketCap" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "agent_performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "starknetAddress" TEXT NOT NULL,
    "evmAddress" TEXT,
    "addressType" "WalletAddressType" NOT NULL,
    "twitterHandle" TEXT,
    "lastConnection" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "used_referral_code" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isAccessCode" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OTP_code_key" ON "OTP"("code");

-- CreateIndex
CREATE INDEX "OTP_code_idx" ON "OTP"("code");

-- CreateIndex
CREATE UNIQUE INDEX "access_codes_code_key" ON "access_codes"("code");

-- CreateIndex
CREATE INDEX "access_codes_code_idx" ON "access_codes"("code");

-- CreateIndex
CREATE INDEX "access_codes_isActive_idx" ON "access_codes"("isActive");

-- CreateIndex
CREATE INDEX "access_codes_type_idx" ON "access_codes"("type");

-- CreateIndex
CREATE UNIQUE INDEX "latest_market_data_elizaAgentId_key" ON "latest_market_data"("elizaAgentId");

-- CreateIndex
CREATE INDEX "latest_market_data_price_idx" ON "latest_market_data"("price");

-- CreateIndex
CREATE INDEX "latest_market_data_priceChange24h_idx" ON "latest_market_data"("priceChange24h");

-- CreateIndex
CREATE INDEX "latest_market_data_marketCap_idx" ON "latest_market_data"("marketCap");

-- CreateIndex
CREATE INDEX "latest_market_data_tvl_idx" ON "latest_market_data"("tvl");

-- CreateIndex
CREATE INDEX "latest_market_data_pnl24h_idx" ON "latest_market_data"("pnl24h");

-- CreateIndex
CREATE INDEX "latest_market_data_pnlRank_idx" ON "latest_market_data"("pnlRank");

-- CreateIndex
CREATE INDEX "FailedAttempt_createdAt_idx" ON "FailedAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "FailedAttempt_codeHash_idx" ON "FailedAttempt"("codeHash");

-- CreateIndex
CREATE UNIQUE INDEX "paradex_markets_symbol_key" ON "paradex_markets"("symbol");

-- CreateIndex
CREATE INDEX "orchestrations_type_idx" ON "orchestrations"("type");

-- CreateIndex
CREATE INDEX "orchestrations_status_idx" ON "orchestrations"("status");

-- CreateIndex
CREATE INDEX "orchestrations_createdAt_idx" ON "orchestrations"("createdAt");

-- CreateIndex
CREATE INDEX "analyses_timestamp_idx" ON "analyses"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "agent_wallet_elizaAgentId_key" ON "agent_wallet"("elizaAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_token_elizaAgentId_key" ON "agent_token"("elizaAgentId");

-- CreateIndex
CREATE INDEX "transactions_createdAt_userAddress_idx" ON "transactions"("createdAt", "userAddress");

-- CreateIndex
CREATE INDEX "portfolio_token_balances_account_balance_id_idx" ON "portfolio_token_balances"("account_balance_id");

-- CreateIndex
CREATE INDEX "portfolio_token_balances_token_symbol_idx" ON "portfolio_token_balances"("token_symbol");

-- CreateIndex
CREATE INDEX "portfolio_token_balances_created_at_idx" ON "portfolio_token_balances"("created_at");

-- CreateIndex
CREATE INDEX "paradex_account_balances_agentId_idx" ON "paradex_account_balances"("agentId");

-- CreateIndex
CREATE INDEX "paradex_account_balances_createdAt_idx" ON "paradex_account_balances"("createdAt");

-- CreateIndex
CREATE INDEX "agent_performance_snapshots_agentId_idx" ON "agent_performance_snapshots"("agentId");

-- CreateIndex
CREATE INDEX "agent_performance_snapshots_timestamp_idx" ON "agent_performance_snapshots"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "users_starknetAddress_key" ON "users"("starknetAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_evmAddress_key" ON "users"("evmAddress");

-- CreateIndex
CREATE INDEX "users_starknetAddress_idx" ON "users"("starknetAddress");

-- CreateIndex
CREATE INDEX "users_evmAddress_idx" ON "users"("evmAddress");

-- CreateIndex
CREATE INDEX "users_used_referral_code_idx" ON "users"("used_referral_code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_userId_key" ON "referral_codes"("userId");

-- CreateIndex
CREATE INDEX "referral_codes_code_idx" ON "referral_codes"("code");

-- AddForeignKey
ALTER TABLE "latest_market_data" ADD CONSTRAINT "latest_market_data_elizaAgentId_fkey" FOREIGN KEY ("elizaAgentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eliza_agents" ADD CONSTRAINT "eliza_agents_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "eliza_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eliza_agents" ADD CONSTRAINT "eliza_agents_accessCodeId_fkey" FOREIGN KEY ("accessCodeId") REFERENCES "access_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_information" ADD CONSTRAINT "trading_information_elizaAgentId_fkey" FOREIGN KEY ("elizaAgentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_wallet" ADD CONSTRAINT "agent_wallet_elizaAgentId_fkey" FOREIGN KEY ("elizaAgentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_token" ADD CONSTRAINT "agent_token_elizaAgentId_fkey" FOREIGN KEY ("elizaAgentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "agent_token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_for_token" ADD CONSTRAINT "price_for_token_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "agent_token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_token_balances" ADD CONSTRAINT "portfolio_token_balances_account_balance_id_fkey" FOREIGN KEY ("account_balance_id") REFERENCES "paradex_account_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paradex_account_balances" ADD CONSTRAINT "paradex_account_balances_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_performance_snapshots" ADD CONSTRAINT "agent_performance_snapshots_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
