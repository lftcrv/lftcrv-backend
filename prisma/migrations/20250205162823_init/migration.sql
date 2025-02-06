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

-- CreateIndex
CREATE UNIQUE INDEX "paradex_markets_symbol_key" ON "paradex_markets"("symbol");
