-- Etapa 10.4 — Timeline/História Oficial: eventos manuais (automáticos
-- são computados em memória, nunca persistidos). Aditiva: nenhuma
-- linha/coluna existente é alterada ou apagada.

CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "squadId" TEXT,
    "cachedPlayerId" TEXT,
    "competitionId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "day" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimelineEvent_squadId_idx" ON "TimelineEvent"("squadId");
CREATE INDEX "TimelineEvent_cachedPlayerId_idx" ON "TimelineEvent"("cachedPlayerId");
CREATE INDEX "TimelineEvent_competitionId_idx" ON "TimelineEvent"("competitionId");
CREATE INDEX "TimelineEvent_year_idx" ON "TimelineEvent"("year");

ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_squadId_fkey"
    FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_cachedPlayerId_fkey"
    FOREIGN KEY ("cachedPlayerId") REFERENCES "CachedPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_competitionId_fkey"
    FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
