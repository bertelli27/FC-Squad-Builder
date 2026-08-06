-- Aditiva: coluna nova, opcional, nenhuma tabela/coluna existente é tocada.
-- Registra se a transferência aconteceu no início ou no meio da temporada.
ALTER TABLE "Transfer" ADD COLUMN "transferWindow" TEXT;
