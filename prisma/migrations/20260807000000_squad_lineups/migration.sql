-- Etapa "escalações múltiplas": permite salvar várias escalações táticas
-- por temporada (nome + formação + titulares/posições próprios), como
-- "táticas" salvas do FIFA. O elenco (SquadPlayer) continua um só,
-- compartilhado por todas as escalações da mesma temporada.

CREATE TABLE "SquadLineup" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formation" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SquadLineup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SquadLineup_seasonId_idx" ON "SquadLineup"("seasonId");

ALTER TABLE "SquadLineup" ADD CONSTRAINT "SquadLineup_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SquadLineupStarter" (
    "id" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "squadPlayerId" TEXT NOT NULL,
    "positionSlot" TEXT NOT NULL,
    "xOffset" DOUBLE PRECISION,
    "yOffset" DOUBLE PRECISION,

    CONSTRAINT "SquadLineupStarter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SquadLineupStarter_lineupId_squadPlayerId_key" ON "SquadLineupStarter"("lineupId", "squadPlayerId");
CREATE UNIQUE INDEX "SquadLineupStarter_lineupId_positionSlot_key" ON "SquadLineupStarter"("lineupId", "positionSlot");
CREATE INDEX "SquadLineupStarter_lineupId_idx" ON "SquadLineupStarter"("lineupId");
CREATE INDEX "SquadLineupStarter_squadPlayerId_idx" ON "SquadLineupStarter"("squadPlayerId");

ALTER TABLE "SquadLineupStarter" ADD CONSTRAINT "SquadLineupStarter_lineupId_fkey"
    FOREIGN KEY ("lineupId") REFERENCES "SquadLineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SquadLineupStarter" ADD CONSTRAINT "SquadLineupStarter_squadPlayerId_fkey"
    FOREIGN KEY ("squadPlayerId") REFERENCES "SquadPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: toda temporada já existente ganha sua "Formação 1" — a
-- escalação que ela já tinha, copiada de Season.formation +
-- SquadPlayer.isStarter/positionSlot/xOffset/yOffset (que a partir desta
-- etapa ficam congelados/deprecated no schema, ver schema.prisma — o app
-- para de lê-los/escrevê-los, mas as colunas continuam existindo, nunca
-- dropadas). Nenhum dado é perdido: cada titular que já estava posicionado
-- vira um SquadLineupStarter idêntico ao que já tinha.
INSERT INTO "SquadLineup" ("id", "seasonId", "name", "formation", "order", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", 'Formação 1', "formation", 0, "createdAt", "updatedAt"
FROM "Season";

INSERT INTO "SquadLineupStarter" ("id", "lineupId", "squadPlayerId", "positionSlot", "xOffset", "yOffset")
SELECT gen_random_uuid()::text, sl."id", sp."id", sp."positionSlot", sp."xOffset", sp."yOffset"
FROM "SquadPlayer" sp
JOIN "SquadLineup" sl ON sl."seasonId" = sp."seasonId"
WHERE sp."isStarter" = true AND sp."positionSlot" IS NOT NULL AND sp."isDeparted" = false;
