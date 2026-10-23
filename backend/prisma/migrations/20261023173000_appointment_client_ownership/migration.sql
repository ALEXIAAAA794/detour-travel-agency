ALTER TABLE "AppointmentRequest"
    ADD COLUMN "clientAccountId" TEXT;

CREATE INDEX "AppointmentRequest_clientAccountId_createdAt_idx"
    ON "AppointmentRequest"("clientAccountId", "createdAt");
