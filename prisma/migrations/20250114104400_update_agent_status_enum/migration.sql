/*
  Warnings:

  - The `status` column on the `eliza_agents` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('STARTING', 'RUNNING', 'STOPPED', 'ERROR');

-- AlterTable
ALTER TABLE "eliza_agents" DROP COLUMN "status",
ADD COLUMN     "status" "AgentStatus" NOT NULL DEFAULT 'STARTING';
