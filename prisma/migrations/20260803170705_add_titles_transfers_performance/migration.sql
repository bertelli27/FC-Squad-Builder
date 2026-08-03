-- Etapa 2: títulos/troféus, transferências e desempenho por temporada.
-- Puramente aditivo (colunas novas com DEFAULT, tabelas novas) — nenhum
-- dado existente é tocado, então roda com segurança em qualquer clube ou
-- temporada já cadastrada.

-- 1. Desempenho: wins/draws/losses na própria Season ("partidas" nunca é
--    coluna própria, é sempre a soma dos três — ver schema.prisma).
ALTER TABLE "Season" ADD COLUMN "wins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Season" ADD COLUMN "draws" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Season" ADD COLUMN "losses" INTEGER NOT NULL DEFAULT 0;

-- 2. Competições (nome + troféu), reutilizadas por qualquer temporada de
--    qualquer clube.
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trophyImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Competition_name_key" ON "Competition"("name");

-- 3. Títulos conquistados por uma temporada específica.
CREATE TABLE "SeasonTitle" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonTitle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SeasonTitle_seasonId_idx" ON "SeasonTitle"("seasonId");
CREATE INDEX "SeasonTitle_competitionId_idx" ON "SeasonTitle"("competitionId");
CREATE UNIQUE INDEX "SeasonTitle_seasonId_competitionId_key" ON "SeasonTitle"("seasonId", "competitionId");

ALTER TABLE "SeasonTitle" ADD CONSTRAINT "SeasonTitle_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeasonTitle" ADD CONSTRAINT "SeasonTitle_competitionId_fkey"
    FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Transferências (entrada/saída) de uma temporada específica.
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "counterpartClub" TEXT,
    "value" DOUBLE PRECISION,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Transfer_seasonId_idx" ON "Transfer"("seasonId");

ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_seasonId_fkey"
    FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
