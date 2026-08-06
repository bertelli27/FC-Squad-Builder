-- Etapa 9 parte 4: aditiva, sem tocar em coluna/tabela existente.

-- §4: ajuste fino de posição no campo tático (deslocamento em pontos
-- percentuais por cima da coordenada padrão do slot da formação).
ALTER TABLE "SquadPlayer" ADD COLUMN "xOffset" DOUBLE PRECISION;
ALTER TABLE "SquadPlayer" ADD COLUMN "yOffset" DOUBLE PRECISION;

-- §1: "competições disputadas nesta temporada" — declaração de
-- participação, nunca cria estatística sozinha.
CREATE TABLE "SeasonCompetition" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonCompetition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeasonCompetition_seasonId_competitionId_key" ON "SeasonCompetition"("seasonId", "competitionId");

CREATE INDEX "SeasonCompetition_seasonId_idx" ON "SeasonCompetition"("seasonId");

CREATE INDEX "SeasonCompetition_competitionId_idx" ON "SeasonCompetition"("competitionId");

ALTER TABLE "SeasonCompetition" ADD CONSTRAINT "SeasonCompetition_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SeasonCompetition" ADD CONSTRAINT "SeasonCompetition_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
