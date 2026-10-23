CREATE TABLE "AppointmentEmail" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "providerId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentEmail_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AppointmentEmail_appointmentId_fkey"
        FOREIGN KEY ("appointmentId") REFERENCES "AppointmentRequest"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AppointmentEmail_appointmentId_createdAt_idx"
    ON "AppointmentEmail"("appointmentId", "createdAt");
