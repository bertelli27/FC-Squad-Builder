-- Etapa 3: estatísticas de jogador por competição.
-- Puramente aditivo (uma tabela nova) — nenhum dado existente é tocado.

CREATE TABLE "PlayerCompetitionStats" (
    "id" TEXT NOT NULL,
    "squadPlayerId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerCompetitionStats_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlayerCompetitionStats_squadPlayerId_idx" ON "PlayerCompetitionStats"("squadPlayerId");
CREATE INDEX "PlayerCompetitionStats_competitionId_idx" ON "PlayerCompetitionStats"("competitionId");
CREATE UNIQUE INDEX "PlayerCompetitionStats_squadPlayerId_competitionId_key" ON "PlayerCompetitionStats"("squadPlayerId", "competitionId");

ALTER TABLE "PlayerCompetitionStats" ADD CONSTRAINT "PlayerCompetitionStats_squadPlayerId_fkey"
    FOREIGN KEY ("squadPlayerId") REFERENCES "SquadPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerCompetitionStats" ADD CONSTRAINT "PlayerCompetitionStats_competitionId_fkey"
    FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
