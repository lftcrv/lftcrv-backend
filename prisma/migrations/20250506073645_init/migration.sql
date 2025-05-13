-- CreateTable
CREATE TABLE "creator_leaderboard_data" (
    "id" TEXT NOT NULL,
    "creatorWallet" TEXT NOT NULL,
    "totalAgents" INTEGER NOT NULL DEFAULT 0,
    "runningAgents" INTEGER NOT NULL DEFAULT 0,
    "totalBalanceInUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aggregatedPnlCycle" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aggregatedPnl24h" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestAgentId" TEXT,
    "bestAgentPnlCycle" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_leaderboard_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_leaderboard_data_creatorWallet_key" ON "creator_leaderboard_data"("creatorWallet");

-- CreateIndex
CREATE INDEX "creator_leaderboard_data_aggregatedPnlCycle_idx" ON "creator_leaderboard_data"("aggregatedPnlCycle");

-- CreateIndex
CREATE INDEX "creator_leaderboard_data_totalBalanceInUSD_idx" ON "creator_leaderboard_data"("totalBalanceInUSD");

-- CreateIndex
CREATE INDEX "creator_leaderboard_data_runningAgents_idx" ON "creator_leaderboard_data"("runningAgents");

-- CreateIndex
CREATE INDEX "eliza_agents_creatorWallet_idx" ON "eliza_agents"("creatorWallet");
