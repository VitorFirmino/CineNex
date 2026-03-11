-- CreateTable
CREATE TABLE IF NOT EXISTS "MaterializedSummary" (
    "id" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaterializedSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MaterializedSummary_expiresAt_idx" ON "MaterializedSummary"("expiresAt");
