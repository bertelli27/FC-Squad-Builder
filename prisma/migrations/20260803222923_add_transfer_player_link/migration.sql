-- Etapa 7: transferência real, ligada ao jogador central — puramente
-- aditivo, nenhuma coluna existente é alterada ou removida.
ALTER TABLE "Transfer" ADD COLUMN "cachedPlayerId" TEXT;
ALTER TABLE "Transfer" ADD COLUMN "dealType" TEXT NOT NULL DEFAULT 'permanent';

ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_cachedPlayerId_fkey"
  FOREIGN KEY ("cachedPlayerId") REFERENCES "CachedPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Transfer_cachedPlayerId_idx" ON "Transfer"("cachedPlayerId");

-- Espelho opcional em CareerTransfer (§22/§23) — criado automaticamente
-- quando uma transferência de clube envolve um jogador com carreira.
ALTER TABLE "CareerTransfer" ADD COLUMN "sourceTransferId" TEXT;

CREATE UNIQUE INDEX "CareerTransfer_sourceTransferId_key" ON "CareerTransfer"("sourceTransferId");

ALTER TABLE "CareerTransfer" ADD CONSTRAINT "CareerTransfer_sourceTransferId_fkey"
  FOREIGN KEY ("sourceTransferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
