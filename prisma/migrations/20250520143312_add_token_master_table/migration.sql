-- CreateTable
CREATE TABLE "token_master" (
    "id" TEXT NOT NULL,
    "canonical_symbol" TEXT NOT NULL,
    "chain_id" TEXT NOT NULL,
    "dex_screener_symbol" TEXT NOT NULL,
    "contract_address" TEXT NOT NULL,
    "found_quote_symbol" TEXT NOT NULL,
    "price_usd" DOUBLE PRECISION,
    "method" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_master_contract_address_chain_id_key" ON "token_master"("contract_address", "chain_id");
