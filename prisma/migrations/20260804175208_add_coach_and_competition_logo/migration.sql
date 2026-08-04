-- Nova etapa: Competição × Troféu + Técnicos como entidade própria.
--
-- 1. Competition ganha "logoUrl", separado de "trophyImageUrl" (dois
--    conceitos distintos: logo = identidade visual usada em estatísticas,
--    troféu = taça física usada em títulos). Puramente aditivo.
ALTER TABLE "Competition" ADD COLUMN "logoUrl" TEXT;

-- 2. Técnico vira uma entidade própria (Coach), reaproveitável entre
--    temporadas — antes eram 3 campos de texto soltos e independentes por
--    temporada (Season.coachName/coachPhotoUrl/coachExternalLink).
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "externalLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Season" ADD COLUMN "coachId" TEXT;

-- Backfill: cada temporada com técnico preenchido ganha seu próprio Coach
-- — nunca mescla nomes iguais de temporadas diferentes automaticamente
-- (podem ser pessoas diferentes; consolidar manualmente fica por conta do
-- usuário, dali em diante, via Gerenciamento → Técnicos). A coluna
-- "_seasonId" existe só pra correlacionar cada Coach recém-criado de volta
-- à Season que o originou (sem ambiguidade mesmo se duas temporadas
-- tiverem nome/foto/link idênticos) — é removida no fim deste bloco.
ALTER TABLE "Coach" ADD COLUMN "_seasonId" TEXT;

INSERT INTO "Coach" ("id", "name", "photoUrl", "externalLink", "createdAt", "_seasonId")
SELECT gen_random_uuid()::text, "coachName", "coachPhotoUrl", "coachExternalLink", "createdAt", "id"
FROM "Season"
WHERE "coachName" IS NOT NULL;

UPDATE "Season" s
SET "coachId" = c."id"
FROM "Coach" c
WHERE c."_seasonId" = s."id";

ALTER TABLE "Coach" DROP COLUMN "_seasonId";

ALTER TABLE "Season" ADD CONSTRAINT "Season_coachId_fkey"
    FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Season_coachId_idx" ON "Season"("coachId");

-- Colunas antigas só removidas depois de garantidamente preservadas acima.
ALTER TABLE "Season" DROP COLUMN "coachName";
ALTER TABLE "Season" DROP COLUMN "coachPhotoUrl";
ALTER TABLE "Season" DROP COLUMN "coachExternalLink";
