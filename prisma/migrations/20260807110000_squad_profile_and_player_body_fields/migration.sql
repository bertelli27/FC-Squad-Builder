-- Etapa 10.2 — campos de perfil pro clube/seleção e dados físicos do jogador.
-- Aditiva: nenhuma linha/coluna existente é alterada ou apagada.

ALTER TABLE "Squad" ADD COLUMN "fullName" TEXT;
ALTER TABLE "Squad" ADD COLUMN "country" TEXT;
ALTER TABLE "Squad" ADD COLUMN "city" TEXT;
ALTER TABLE "Squad" ADD COLUMN "foundedYear" INTEGER;
ALTER TABLE "Squad" ADD COLUMN "stadium" TEXT;
ALTER TABLE "Squad" ADD COLUMN "colors" TEXT;
ALTER TABLE "Squad" ADD COLUMN "confederation" TEXT;

ALTER TABLE "CachedPlayer" ADD COLUMN "heightCm" INTEGER;
ALTER TABLE "CachedPlayer" ADD COLUMN "weightKg" INTEGER;
ALTER TABLE "CachedPlayer" ADD COLUMN "preferredFoot" TEXT;
