-- Etapa 9 parte 3: minikits por temporada. Tabela nova, aditiva — nenhuma
-- coluna/tabela existente é tocada, então clubes/temporadas já cadastrados
-- continuam funcionando sem nenhum kit até o usuário cadastrar algum.
CREATE TABLE "SeasonKit" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeasonKit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SeasonKit_seasonId_type_key" ON "SeasonKit"("seasonId", "type");

CREATE INDEX "SeasonKit_seasonId_idx" ON "SeasonKit"("seasonId");

ALTER TABLE "SeasonKit" ADD CONSTRAINT "SeasonKit_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
