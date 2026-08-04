-- Etapa 9 parte 2: "category" (só international/national) vira "scope"
-- (world/continental/national) — renomeia a coluna preservando qualquer
-- valor existente (nenhuma competição em produção tinha isso preenchido
-- ainda, então não há remapeamento de valor a fazer).
ALTER TABLE "Competition" RENAME COLUMN "category" TO "scope";
