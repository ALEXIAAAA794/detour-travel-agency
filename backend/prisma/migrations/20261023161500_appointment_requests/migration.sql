CREATE TYPE "AppointmentRequestStatus" AS ENUM ('PENDING', 'CONTACTED', 'SCHEDULED', 'CANCELLED');

CREATE TABLE "AppointmentRequest" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "phone" TEXT,
    "preferredDate" DATE NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT,
    "status" "AppointmentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AppointmentRequest_status_createdAt_idx"
    ON "AppointmentRequest"("status", "createdAt");
