-- Etapa 1: introduz o conceito de Temporada (Season).
--
-- Migration escrita manualmente (não pelo `prisma migrate dev`, que em modo
-- não-interativo recusa a rodar e cujo diff automático faria DROP COLUMN
-- direto em dados existentes) para garantir que NENHUM dado seja perdido:
-- toda coluna que sai de "Squad" (formation/coachName/coachPhotoUrl/
-- coachExternalLink/notes) e toda linha de "SquadPlayer" é primeiro
-- REALOCADA para uma nova "Season" (uma por clube já existente, ano 2026 —
-- ano corrente no momento desta migration) e só depois a coluna antiga é
-- removida. Nenhum Squad, CachedPlayer ou SquadPlayer é apagado.

-- 1. Novas colunas do clube: cor de identidade visual e tipo de calendário.
ALTER TABLE "Squad" ADD COLUMN "primaryColor" TEXT;
ALTER TABLE "Squad" ADD COLUMN "seasonCalendar" TEXT NOT NULL DEFAULT 'brasileiro';

-- 2. Tabela de temporadas.
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "squadId" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "formation" TEXT NOT NULL DEFAULT '4-3-3',
    "coachName" TEXT,
    "coachPhotoUrl" TEXT,
    "coachExternalLink" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Season_squadId_idx" ON "Season"("squadId");
CREATE UNIQUE INDEX "Season_squadId_startYear_key" ON "Season"("squadId", "startYear");

ALTER TABLE "Season" ADD CONSTRAINT "Season_squadId_fkey"
    FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Uma temporada 2026 pra cada clube já existente, copiando exatamente o
--    que já estava em Squad (formação/técnico/notas) — o elenco de cada
--    clube continua aparecendo exatamente como antes, agora "dentro" dessa
--    temporada em vez de direto no clube.
INSERT INTO "Season" ("id", "squadId", "startYear", "formation", "coachName", "coachPhotoUrl", "coachExternalLink", "notes", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 2026, "formation", "coachName", "coachPhotoUrl", "coachExternalLink", "notes", "createdAt", "updatedAt"
FROM "Squad";

-- 4. SquadPlayer passa a pendurar em Season, não mais direto em Squad.
ALTER TABLE "SquadPlayer" ADD COLUMN "seasonId" TEXT;

UPDATE "SquadPlayer" sp
SET "seasonId" = s."id"
FROM "Season" s
WHERE s."squadId" = sp."squadId" AND s."startYear" = 2026;

ALTER TABLE "SquadPlayer" ALTER COLUMN "seasonId" SET NOT NULL;

ALTER TABLE "SquadPlayer" DROP CONSTRAINT "SquadPlayer_squadId_fkey";
DROP INDEX "SquadPlayer_squadId_cachedPlayerId_key";
ALTER TABLE "SquadPlayer" DROP COLUMN "squadId";

ALTER TABLE "SquadPlayer" ADD CONSTRAINT "SquadPlayer_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "SquadPlayer_seasonId_cachedPlayerId_key" ON "SquadPlayer"("seasonId", "cachedPlayerId");

-- 5. Essas colunas agora vivem em Season (copiadas no passo 3 acima) — só
--    removidas de Squad depois de garantidamente preservadas ali.
ALTER TABLE "Squad" DROP COLUMN "formation";
ALTER TABLE "Squad" DROP COLUMN "coachName";
ALTER TABLE "Squad" DROP COLUMN "coachPhotoUrl";
ALTER TABLE "Squad" DROP COLUMN "coachExternalLink";
ALTER TABLE "Squad" DROP COLUMN "notes";
