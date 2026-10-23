CREATE TYPE "TravelReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "TravelReview" (
    "id" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "destination" TEXT,
    "rating" INTEGER NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "status" "TravelReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TravelReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TravelReview_status_createdAt_idx"
    ON "TravelReview"("status", "createdAt");
CREATE INDEX "TravelReview_clientEmail_createdAt_idx"
    ON "TravelReview"("clientEmail", "createdAt");
