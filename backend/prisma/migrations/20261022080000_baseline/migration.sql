-- Baseline : la table destinations existe d?j? dans la base.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "destinations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "country" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "destinations_name_country_unique"
ON "destinations"("name", "country");
