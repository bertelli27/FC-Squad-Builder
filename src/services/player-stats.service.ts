import { prisma } from "@/lib/prisma";
import { competitionService } from "./competition.service";

/**
 * Per-player, per-competition stats within one season (§1 etapa 3) — see
 * schema.prisma's comment on PlayerCompetitionStats for why this hangs off
 * SquadPlayer (already scopes player+season) instead of repeating those
 * ids here, and why duplicating a season never carries these over.
 */
export const playerStatsService = {
  async listStats(squadPlayerId: string) {
    return prisma.playerCompetitionStats.findMany({
      where: { squadPlayerId },
      include: { competition: true },
      orderBy: { competition: { name: "asc" } },
    });
  },

  /**
   * Starts tracking a competition for this player (zeroed row) — resolving
   * the competition either by an existing id or by name (creating it if
   * new, same as seasonService.addTitle). Idempotent per competition: the
   * unique constraint would reject a plain duplicate insert, so this just
   * returns the existing row instead of erroring.
   */
  async addCompetitionStats(
    squadPlayerId: string,
    input: {
      competitionId?: string;
      competitionName?: string;
      appearances?: number;
      goals?: number;
      assists?: number;
    },
  ) {
    let competitionId = input.competitionId;
    if (!competitionId) {
      if (!input.competitionName?.trim()) return null;
      const competition = await competitionService.findOrCreateCompetition(input.competitionName);
      competitionId = competition.id;
    }

    const existing = await prisma.playerCompetitionStats.findUnique({
      where: { squadPlayerId_competitionId: { squadPlayerId, competitionId } },
      include: { competition: true },
    });
    if (existing) return existing;

    // §1.3 etapa 9-4 — quando a competição já aparece automaticamente pra
    // este jogador (SeasonCompetition da temporada), a linha real só nasce
    // no primeiro valor digitado: já cria com esse valor em vez de um
    // create+update separado. O check-then-create acima não é atômico —
    // duas requisições quase simultâneas (o dialog de estatísticas
    // consegue disparar isso a partir de mais de um campo) podem ambas
    // passar pelo `existing` como null e uma delas esbarrar na unique
    // constraint aqui; nesse caso a outra já criou a linha, então só
    // busca e devolve ela em vez de estourar erro — mesmo espírito de
    // "idempotente" que o comentário acima já promete.
    return prisma.playerCompetitionStats
      .create({
        data: {
          squadPlayerId,
          competitionId,
          appearances: input.appearances ?? 0,
          goals: input.goals ?? 0,
          assists: input.assists ?? 0,
        },
        include: { competition: true },
      })
      .catch(() =>
        prisma.playerCompetitionStats.findUnique({
          where: { squadPlayerId_competitionId: { squadPlayerId, competitionId } },
          include: { competition: true },
        }),
      );
  },

  async updateStats(
    statsId: string,
    data: { appearances?: number; goals?: number; assists?: number },
  ) {
    return prisma.playerCompetitionStats.update({ where: { id: statsId }, data });
  },

  async removeStats(squadPlayerId: string, statsId: string) {
    await prisma.playerCompetitionStats.delete({ where: { id: statsId, squadPlayerId } });
  },
};
