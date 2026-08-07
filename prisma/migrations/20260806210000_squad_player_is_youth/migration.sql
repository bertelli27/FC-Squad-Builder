-- Aditiva: coluna nova, opcional (com default), nenhuma tabela/coluna existente é tocada.
-- Marca um jogador como "jogador da base" (categoria de base do clube).
ALTER TABLE "SquadPlayer" ADD COLUMN "isYouth" BOOLEAN NOT NULL DEFAULT false;
