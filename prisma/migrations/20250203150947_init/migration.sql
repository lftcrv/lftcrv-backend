-- CreateEnum
CREATE TYPE "AnalysisType" AS ENUM ('TECHNICAL', 'SENTIMENT', 'MARKET', 'OVERALL');

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
CREATE TABLE "price_for_token" (
    "id" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "tokenId" TEXT NOT NULL,

    CONSTRAINT "price_for_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analyses_timestamp_idx" ON "analyses"("timestamp");

-- AddForeignKey
ALTER TABLE "price_for_token" ADD CONSTRAINT "price_for_token_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "agent_token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
