-- Etapa 5: carreira pela seleção.
-- Puramente aditivo (uma coluna com DEFAULT + uma tabela nova) — nenhum
-- dado existente é tocado.

-- 1. Distingue passagem por clube de passagem por seleção. Todo CareerStint
--    já existente vira 'club' automaticamente (era o único tipo até agora).
ALTER TABLE "CareerStint" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'club';

-- 2. Estatísticas de UM ano de seleção por competição (Copa do Mundo,
--    Eliminatórias, Amistosos...).
CREATE TABLE "CareerStintCompetitionStats" (
    "id" TEXT NOT NULL,
    "stintId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerStintCompetitionStats_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CareerStintCompetitionStats_stintId_idx" ON "CareerStintCompetitionStats"("stintId");
CREATE INDEX "CareerStintCompetitionStats_competitionId_idx" ON "CareerStintCompetitionStats"("competitionId");
CREATE UNIQUE INDEX "CareerStintCompetitionStats_stintId_competitionId_key" ON "CareerStintCompetitionStats"("stintId", "competitionId");

ALTER TABLE "CareerStintCompetitionStats" ADD CONSTRAINT "CareerStintCompetitionStats_stintId_fkey"
    FOREIGN KEY ("stintId") REFERENCES "CareerStint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerStintCompetitionStats" ADD CONSTRAINT "CareerStintCompetitionStats_competitionId_fkey"
    FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
