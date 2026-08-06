-- Etapa 9 complementar: aditiva, nenhuma coluna/tabela existente é tocada.

-- §1/§2 — dashboard personalizável: ordem de grupos e de elencos dentro
-- deles. null = ordem automática (comportamento de sempre).
ALTER TABLE "Category" ADD COLUMN "order" INTEGER;
ALTER TABLE "Squad" ADD COLUMN "dashboardOrder" INTEGER;

-- §10-14 — jogador transferido/vendido não apaga mais a linha (nem, em
-- cascata, as estatísticas dela): só marca isDeparted, some do elenco
-- ativo mas continua existindo pro histórico do clube e pra carreira.
ALTER TABLE "SquadPlayer" ADD COLUMN "isDeparted" BOOLEAN NOT NULL DEFAULT false;
