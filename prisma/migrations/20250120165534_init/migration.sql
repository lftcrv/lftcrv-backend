-- CreateEnum
CREATE TYPE "OrchestrationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

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

-- CreateIndex
CREATE INDEX "orchestrations_type_idx" ON "orchestrations"("type");

-- CreateIndex
CREATE INDEX "orchestrations_status_idx" ON "orchestrations"("status");

-- CreateIndex
CREATE INDEX "orchestrations_createdAt_idx" ON "orchestrations"("createdAt");
