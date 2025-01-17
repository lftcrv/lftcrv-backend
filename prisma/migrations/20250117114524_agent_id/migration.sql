-- DropIndex
DROP INDEX "eliza_agents_name_key";

-- AlterTable
ALTER TABLE "eliza_agents" ADD COLUMN     "runtimeAgentId" TEXT;
