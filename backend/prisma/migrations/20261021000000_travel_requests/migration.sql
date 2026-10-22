CREATE TYPE "TravelRequestStatus" AS ENUM (
  'PENDING_REVIEW', 'PREPARATION_AVAILABLE', 'PREPARATION_IN_PROGRESS',
  'SUBMITTED', 'FEASIBILITY_REVIEW', 'CHANGES_REQUESTED',
  'CONFIRMED_AWAITING_PAYMENT', 'PAID', 'REFUSED', 'EXPIRED'
);

CREATE TABLE "TravelRequest" (
  "id" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "departure" TIMESTAMP(3),
  "returnDate" TIMESTAMP(3),
  "travelers" INTEGER NOT NULL,
  "budget" TEXT,
  "travelType" TEXT,
  "preferences" TEXT,
  "itinerary" JSONB,
  "paymentUrl" TEXT,
  "status" "TravelRequestStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TravelRequest_accessToken_key" ON "TravelRequest"("accessToken");
CREATE INDEX "TravelRequest_email_idx" ON "TravelRequest"("email");
CREATE INDEX "TravelRequest_status_idx" ON "TravelRequest"("status");
