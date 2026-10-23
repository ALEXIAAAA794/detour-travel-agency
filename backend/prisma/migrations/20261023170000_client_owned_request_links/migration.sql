ALTER TABLE "TravelRequest"
    ADD COLUMN "clientAccountId" TEXT,
    ADD COLUMN "preparationTokenHash" TEXT,
    ADD COLUMN "preparationTokenExpiresAt" TIMESTAMP(3),
    ADD COLUMN "preparationTokenRevokedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "TravelRequest_preparationTokenHash_key"
    ON "TravelRequest"("preparationTokenHash");

CREATE INDEX "TravelRequest_clientAccountId_createdAt_idx"
    ON "TravelRequest"("clientAccountId", "createdAt");
