import { prisma } from "@/lib/prisma";
import { careerService } from "./career.service";

/**
 * Etapa 10.2 — agrega tudo ligado a um CachedPlayer pelo app inteiro
 * (qualquer clube/temporada/seleção), pra alimentar o perfil de jogador
 * (/players/[cachedPlayerId]). Diferente de playerDataService (cadastro) e
 * careerService (carreira opt-in, a maioria dos jogadores não tem uma) —
 * esta é uma responsabilidade nova: leitura/agregação, nunca escrita.
 */
export const playerProfileService = {
  /**
   * Identidade + clube atual (relação já existe) + carreira vinculada (se
   * houver — reaproveita findCareerIdsByCachedPlayerIds) + "seleção atual"
   * (melhor esforço: última passagem não-isDeparted numa seleção).
   */
  async getProfile(cachedPlayerId: string) {
    const player = await prisma.cachedPlayer.findUnique({
      where: { id: cachedPlayerId },
      include: { currentClub: { select: { id: true, name: true, logoUrl: true } } },
    });
    if (!player) return null;

    const [careerIds, currentCallup] = await Promise.all([
      careerService.findCareerIdsByCachedPlayerIds([cachedPlayerId]),
      prisma.squadPlayer.findFirst({
        where: { cachedPlayerId, isDeparted: false, season: { squad: { baseKind: "nationalTeam" } } },
        select: { season: { select: { squad: { select: { id: true, name: true, logoUrl: true } } } } },
        orderBy: { season: { startYear: "desc" } },
      }),
    ]);

    return {
      ...player,
      careerId: careerIds.get(cachedPlayerId) ?? null,
      currentNationalTeam: currentCallup?.season.squad ?? null,
    };
  },

  /** Resumo leve pra aba "Carreira" — não reimplementa career-workspace.tsx, só mostra o suficiente pra decidir "ver completa" ou "criar". */
  async getCareerSummary(careerId: string) {
    return prisma.playerCareer.findUnique({
      where: { id: careerId },
      select: { id: true, summary: true, _count: { select: { stints: true, transfers: true } } },
    });
  },

  /** Todo SquadPlayer do jogador, em qualquer clube/seleção, mais recente primeiro. Alimenta a aba "Temporadas". */
  async getSeasons(cachedPlayerId: string) {
    return prisma.squadPlayer.findMany({
      where: { cachedPlayerId },
      include: {
        season: {
          include: {
            squad: { select: { id: true, name: true, logoUrl: true, baseKind: true, seasonCalendar: true } },
            competition: true,
          },
        },
      },
      orderBy: { season: { startYear: "desc" } },
    });
  },

  /** Como getSeasons, filtrado a seleções. Alimenta a aba "Seleções". */
  async getNationalTeamCallups(cachedPlayerId: string) {
    return prisma.squadPlayer.findMany({
      where: { cachedPlayerId, season: { squad: { baseKind: "nationalTeam" } } },
      include: {
        season: {
          include: {
            squad: { select: { id: true, name: true, logoUrl: true, seasonCalendar: true } },
            competition: true,
          },
        },
      },
      orderBy: { season: { startYear: "desc" } },
    });
  },

  /** Soma PlayerCompetitionStats via SquadPlayer→Season→Squad.baseKind, dividido Clubes/Seleções/Total. Alimenta a aba "Estatísticas". */
  async getStats(cachedPlayerId: string) {
    const rows = await prisma.playerCompetitionStats.findMany({
      where: { squadPlayer: { cachedPlayerId } },
      include: { squadPlayer: { include: { season: { include: { squad: { select: { baseKind: true } } } } } } },
    });

    const zero = { appearances: 0, goals: 0, assists: 0 };
    const club = { ...zero };
    const nationalTeam = { ...zero };
    for (const row of rows) {
      const bucket = row.squadPlayer.season.squad.baseKind === "nationalTeam" ? nationalTeam : club;
      bucket.appearances += row.appearances;
      bucket.goals += row.goals;
      bucket.assists += row.assists;
    }

    return {
      club,
      nationalTeam,
      total: {
        appearances: club.appearances + nationalTeam.appearances,
        goals: club.goals + nationalTeam.goals,
        assists: club.assists + nationalTeam.assists,
      },
    };
  },

  /**
   * SeasonTitle de temporadas em que o jogador tinha SquadPlayer, dividido
   * Clubes/Seleções/Total. Nuance: isso é "títulos do clube na temporada em
   * que o jogador estava no elenco", não "títulos que ele pessoalmente
   * ganhou jogando" — o schema não tem esse vínculo por jogador (criar um
   * seria uma entidade nova, fora do escopo desta etapa).
   */
  async getTitles(cachedPlayerId: string) {
    const seasons = await prisma.season.findMany({
      where: { players: { some: { cachedPlayerId } }, titles: { some: {} } },
      include: {
        titles: { include: { competition: true } },
        squad: { select: { id: true, name: true, logoUrl: true, baseKind: true } },
      },
    });

    const club: { id: string; competition: { id: string; name: string; trophyImageUrl: string | null }; season: { id: string; startYear: number }; squad: { id: string; name: string; logoUrl: string | null } }[] = [];
    const nationalTeam: typeof club = [];
    for (const season of seasons) {
      const bucket = season.squad.baseKind === "nationalTeam" ? nationalTeam : club;
      for (const title of season.titles) {
        bucket.push({
          id: title.id,
          competition: title.competition,
          season: { id: season.id, startYear: season.startYear },
          squad: season.squad,
        });
      }
    }

    return { club, nationalTeam, total: club.length + nationalTeam.length };
  },

  /** Transfer onde cachedPlayerId bate (FK que já existe desde a etapa 7). Alimenta a aba "Transferências". */
  async getTransfers(cachedPlayerId: string) {
    return prisma.transfer.findMany({
      where: { cachedPlayerId },
      include: {
        season: { include: { squad: { select: { id: true, name: true, logoUrl: true, seasonCalendar: true } } } },
      },
      orderBy: [{ season: { startYear: "desc" } }, { order: "asc" }],
    });
  },
};
