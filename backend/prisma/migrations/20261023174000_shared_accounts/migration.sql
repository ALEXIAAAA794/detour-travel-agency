CREATE TABLE "ClientAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManagerAccount" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManagerSession" (
    "tokenHash" TEXT NOT NULL,
    "managerId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ManagerSession_pkey" PRIMARY KEY ("tokenHash"),
    CONSTRAINT "ManagerSession_managerId_fkey"
        FOREIGN KEY ("managerId") REFERENCES "ManagerAccount"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ClientAccount_email_key" ON "ClientAccount"("email");
CREATE UNIQUE INDEX "ManagerAccount_identifier_key" ON "ManagerAccount"("identifier");
CREATE INDEX "ManagerSession_expiresAt_idx" ON "ManagerSession"("expiresAt");
