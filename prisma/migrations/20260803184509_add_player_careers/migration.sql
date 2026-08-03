-- Etapa 4: módulo de carreiras de jogador.
-- Puramente aditivo (quatro tabelas novas) — nenhuma tabela existente é
-- alterada, então clubes/temporadas cadastrados continuam intactos.

CREATE TABLE "PlayerCareer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "cachedPlayerId" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerCareer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PlayerCareer" ADD CONSTRAINT "PlayerCareer_cachedPlayerId_fkey"
    FOREIGN KEY ("cachedPlayerId") REFERENCES "CachedPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CareerStint" (
    "id" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "seasonId" TEXT,
    "clubName" TEXT NOT NULL,
    "clubLogoUrl" TEXT,
    "startYear" INTEGER NOT NULL,
    "calendar" TEXT NOT NULL DEFAULT 'brasileiro',
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerStint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareerStint_careerId_idx" ON "CareerStint"("careerId");
CREATE INDEX "CareerStint_seasonId_idx" ON "CareerStint"("seasonId");

ALTER TABLE "CareerStint" ADD CONSTRAINT "CareerStint_careerId_fkey"
    FOREIGN KEY ("careerId") REFERENCES "PlayerCareer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerStint" ADD CONSTRAINT "CareerStint_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CareerTitle" (
    "id" TEXT NOT NULL,
    "stintId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerTitle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareerTitle_stintId_idx" ON "CareerTitle"("stintId");
CREATE UNIQUE INDEX "CareerTitle_stintId_competitionId_key" ON "CareerTitle"("stintId", "competitionId");

ALTER TABLE "CareerTitle" ADD CONSTRAINT "CareerTitle_stintId_fkey"
    FOREIGN KEY ("stintId") REFERENCES "CareerStint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerTitle" ADD CONSTRAINT "CareerTitle_competitionId_fkey"
    FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CareerTransfer" (
    "id" TEXT NOT NULL,
    "careerId" TEXT NOT NULL,
    "fromClubName" TEXT,
    "toClubName" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "year" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareerTransfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareerTransfer_careerId_idx" ON "CareerTransfer"("careerId");

ALTER TABLE "CareerTransfer" ADD CONSTRAINT "CareerTransfer_careerId_fkey"
    FOREIGN KEY ("careerId") REFERENCES "PlayerCareer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
