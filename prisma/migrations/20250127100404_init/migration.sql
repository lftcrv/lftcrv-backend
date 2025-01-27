/*
  Warnings:

  - Added the required column `buyTax` to the `agent_token` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellTax` to the `agent_token` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "agent_token" ADD COLUMN     "buyTax" INTEGER NOT NULL,
ADD COLUMN     "sellTax" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "buyToken" TEXT NOT NULL,
    "sellToken" TEXT NOT NULL,
    "buyAmount" BIGINT NOT NULL,
    "sellAmount" BIGINT NOT NULL,
    "hash" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "userAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_createdAt_userAddress_idx" ON "transactions"("createdAt", "userAddress");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "agent_token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
