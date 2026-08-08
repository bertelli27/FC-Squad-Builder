-- Etapa 10.6 — Museu + Hall da Fama: reconhecimento oficial manual (só o
-- reconhecimento em si — nenhuma estatística é copiada pra cá, todo número
-- exibido junto continua vindo ao vivo de PlayerCompetitionStats/SeasonTitle/
-- Transfer via statisticsService). Aditiva: nenhuma linha/coluna existente é
-- alterada ou apagada.

CREATE TABLE "HallOfFameEntry" (
    "id" TEXT NOT NULL,
    "cachedPlayerId" TEXT,
    "coachId" TEXT,
    "squadId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HallOfFameEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HallOfFameEntry_cachedPlayerId_idx" ON "HallOfFameEntry"("cachedPlayerId");
CREATE INDEX "HallOfFameEntry_coachId_idx" ON "HallOfFameEntry"("coachId");
CREATE INDEX "HallOfFameEntry_squadId_idx" ON "HallOfFameEntry"("squadId");

-- cachedPlayerId/coachId: dono do reconhecimento — Cascade (sem eles a linha
-- não faz sentido, mesmo padrão de TimelineEvent.cachedPlayerId).
ALTER TABLE "HallOfFameEntry" ADD CONSTRAINT "HallOfFameEntry_cachedPlayerId_fkey"
    FOREIGN KEY ("cachedPlayerId") REFERENCES "CachedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HallOfFameEntry" ADD CONSTRAINT "HallOfFameEntry_coachId_fkey"
    FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- squadId: só contexto (clube/seleção onde a pessoa é lenda) — SetNull, mesmo
-- papel que CachedPlayer.currentClubId/Transfer.counterpartSquadId já têm:
-- apagar um clube nunca deve apagar um reconhecimento histórico curado à mão.
ALTER TABLE "HallOfFameEntry" ADD CONSTRAINT "HallOfFameEntry_squadId_fkey"
    FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
