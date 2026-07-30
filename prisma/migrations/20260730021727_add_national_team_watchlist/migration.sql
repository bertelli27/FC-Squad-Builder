-- AlterTable
ALTER TABLE "Squad" ADD COLUMN     "baseKind" TEXT;

-- AlterTable
ALTER TABLE "SquadPlayer" ADD COLUMN     "isWatchlist" BOOLEAN NOT NULL DEFAULT false;
