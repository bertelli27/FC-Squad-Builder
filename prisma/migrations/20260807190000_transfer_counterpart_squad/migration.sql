-- Etapa 10.3 — clube de origem/destino real da transferência (opcional).
-- Aditiva: nenhuma linha/coluna existente é alterada ou apagada.

ALTER TABLE "Transfer" ADD COLUMN "counterpartSquadId" TEXT;
CREATE INDEX "Transfer_counterpartSquadId_idx" ON "Transfer"("counterpartSquadId");
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_counterpartSquadId_fkey"
    FOREIGN KEY ("counterpartSquadId") REFERENCES "Squad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
