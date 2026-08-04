-- Etapa 9: classificação de competições (clube/seleção, internacional/
-- nacional, organizador, país, descrição) + histórico de campeões por
-- edição. Puramente aditivo: nenhuma coluna existente é alterada ou
-- removida, todas as colunas novas são nullable.

ALTER TABLE "Competition" ADD COLUMN "kind" TEXT;
ALTER TABLE "Competition" ADD COLUMN "category" TEXT;
ALTER TABLE "Competition" ADD COLUMN "organizer" TEXT;
ALTER TABLE "Competition" ADD COLUMN "country" TEXT;
ALTER TABLE "Competition" ADD COLUMN "description" TEXT;

CREATE TABLE "CompetitionChampion" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seasonId" TEXT,
    "standaloneName" TEXT NOT NULL,
    "standaloneLogoUrl" TEXT,
    "standaloneCountry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompetitionChampion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompetitionChampion_competitionId_year_key" ON "CompetitionChampion"("competitionId", "year");
CREATE INDEX "CompetitionChampion_competitionId_idx" ON "CompetitionChampion"("competitionId");
CREATE INDEX "CompetitionChampion_seasonId_idx" ON "CompetitionChampion"("seasonId");

ALTER TABLE "CompetitionChampion" ADD CONSTRAINT "CompetitionChampion_competitionId_fkey"
    FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompetitionChampion" ADD CONSTRAINT "CompetitionChampion_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
