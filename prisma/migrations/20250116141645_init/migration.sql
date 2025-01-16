-- CreateTable
CREATE TABLE "trading_information" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elizaAgentId" TEXT NOT NULL,
    "information" JSONB NOT NULL,

    CONSTRAINT "trading_information_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "trading_information" ADD CONSTRAINT "trading_information_elizaAgentId_fkey" FOREIGN KEY ("elizaAgentId") REFERENCES "eliza_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
