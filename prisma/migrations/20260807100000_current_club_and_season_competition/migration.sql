-- Etapa 10.1 — clube atual do jogador + convocação de seleção por competição.
-- Aditiva: nenhuma linha/coluna existente é alterada ou apagada.

-- §Parte 3: clube atual do jogador (referência de verdade, não mais só o
-- texto livre em CachedPlayer.club).
ALTER TABLE "CachedPlayer" ADD COLUMN "currentClubId" TEXT;
CREATE INDEX "CachedPlayer_currentClubId_idx" ON "CachedPlayer"("currentClubId");
ALTER TABLE "CachedPlayer" ADD CONSTRAINT "CachedPlayer_currentClubId_fkey"
    FOREIGN KEY ("currentClubId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- §Parte 7/8: uma temporada pode opcionalmente ser a convocação pra uma
-- competição específica (reaproveita o Competition já existente).
ALTER TABLE "Season" ADD COLUMN "competitionId" TEXT;
CREATE INDEX "Season_competitionId_idx" ON "Season"("competitionId");
ALTER TABLE "Season" ADD CONSTRAINT "Season_competitionId_fkey"
    FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Solta a trava "só uma temporada por ano" (impedia seleção ter mais de
-- uma convocação no mesmo ano) — a regra "clube continua só uma por ano"
-- passa a ser garantida em season.service.ts#createSeason, não mais o
-- banco (ver comentário no schema.prisma). Nenhuma linha existente é
-- afetada — só a restrição que impedia inserções futuras é removida.
DROP INDEX "Season_squadId_startYear_key";
CREATE INDEX "Season_squadId_startYear_idx" ON "Season"("squadId", "startYear");
