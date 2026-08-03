-- Etapa 6: cadastro completo do jogador (posições secundárias, data de
-- nascimento, flag de edição manual) — puramente aditivo.
ALTER TABLE "CachedPlayer" ADD COLUMN "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "CachedPlayer" ADD COLUMN "secondaryPositions" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "CachedPlayer" ADD COLUMN "manuallyEdited" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: toda carreira "avulsa" (criada sem vincular a um CachedPlayer
-- existente, cachedPlayerId IS NULL) ganha um CachedPlayer "custom" próprio,
-- copiando o nome/foto já cadastrados na própria carreira. A partir de
-- agora createCareer sempre garante isso na criação (ver career.service.ts)
-- — este passo só cobre carreiras que já existiam antes desta etapa.
-- Nenhum dado é perdido: nome/foto originais são preservados no novo
-- registro, e a carreira em si (temporadas, títulos, transferências,
-- estatísticas) não é tocada.
-- externalId is set to the originating PlayerCareer's own id (a unique
-- cuid) purely to correlate the two statements below 1:1, without risking
-- an ambiguous match if two careers happen to share the same name/photo.
INSERT INTO "CachedPlayer" ("id", "source", "externalId", "name", "photoUrl", "rawData", "fetchedAt", "expiresAt")
SELECT
  gen_random_uuid()::text,
  'custom',
  pc."id",
  pc."name",
  pc."photoUrl",
  '{"custom": true}'::jsonb,
  now(),
  now() + interval '36500 days'
FROM "PlayerCareer" pc
WHERE pc."cachedPlayerId" IS NULL;

UPDATE "PlayerCareer" pc
SET "cachedPlayerId" = cp."id"
FROM "CachedPlayer" cp
WHERE cp."source" = 'custom'
  AND cp."externalId" = pc."id"
  AND pc."cachedPlayerId" IS NULL;
