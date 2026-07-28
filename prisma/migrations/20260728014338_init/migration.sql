-- CreateTable
CREATE TABLE "CachedPlayer" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "nationality" TEXT,
    "position" TEXT,
    "club" TEXT,
    "league" TEXT,
    "overall" INTEGER,
    "potential" INTEGER,
    "age" INTEGER,
    "rawData" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedClub" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "league" TEXT,
    "country" TEXT,
    "logoUrl" TEXT,
    "rawData" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedClub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedNationalTeam" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flagUrl" TEXT,
    "rawData" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedNationalTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Squad" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseClubRef" TEXT,
    "formation" TEXT NOT NULL DEFAULT '4-3-3',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SquadPlayer" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "cachedPlayerId" TEXT NOT NULL,
    "shirtNumber" INTEGER,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "positionSlot" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SquadPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CachedPlayer_name_idx" ON "CachedPlayer"("name");

-- CreateIndex
CREATE INDEX "CachedPlayer_club_idx" ON "CachedPlayer"("club");

-- CreateIndex
CREATE INDEX "CachedPlayer_league_idx" ON "CachedPlayer"("league");

-- CreateIndex
CREATE UNIQUE INDEX "CachedPlayer_source_externalId_key" ON "CachedPlayer"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedClub_source_externalId_key" ON "CachedClub"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "CachedNationalTeam_source_externalId_key" ON "CachedNationalTeam"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "SquadPlayer_squadId_cachedPlayerId_key" ON "SquadPlayer"("squadId", "cachedPlayerId");

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_cachedPlayerId_fkey" FOREIGN KEY ("cachedPlayerId") REFERENCES "CachedPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
