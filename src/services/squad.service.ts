import { prisma } from "@/lib/prisma";
import { clubDataService } from "./club-data.service";
import { nationalTeamDataService } from "./national-team-data.service";
import { tagService } from "./tag.service";
import { seasonService, ensureCareerStintForSeason } from "./season.service";
import { statisticsService } from "./statistics.service";
import { sortPlayerAggregates } from "@/lib/statistics";
import type { Player } from "@/types/domain";

export interface CreateSquadInput {
  name: string;
  formation?: string;
  /** Auto-loads the base roster from a club or national team, by name (re-resolved live so this doesn't depend on prior cache state). */
  base?: { kind: "club" | "nationalTeam"; name: string };
  categoryId?: string | null;
  /** Tag names — resolved/created via tagService.findOrCreateTags and connected. */
  tagNames?: string[];
  /** First season's year — defaults to the current calendar year. */
  startYear?: number;
}

async function resolveBase(
  base: NonNullable<CreateSquadInput["base"]>,
): Promise<{ externalId: string; logoUrl?: string; players: Player[] } | null> {
  if (base.kind === "club") {
    const club = await clubDataService.resolveClub(base.name);
    if (!club) return null;
    return {
      externalId: club.externalId,
      logoUrl: club.logoUrl,
      players: await clubDataService.getClubSquad(club),
    };
  }

  const team = await nationalTeamDataService.resolveNationalTeam(base.name);
  if (!team) return null;
  return {
    externalId: team.externalId,
    logoUrl: team.flagUrl,
    players: await nationalTeamDataService.getNationalTeamSquad(team),
  };
}

export const squadService = {
  /**
   * All clubs with just enough to power the home page's cards and its
   * client-side favorite/category/tag/search filtering (§V2), plus their
   * most recent season (for the formation/player-count shown on the card)
   * — no need for full rosters here, that's what getSquad/getSeason are for.
   */
  /**
   * Dashboard personalizável (etapa 9 complementar, §2/§3/§4) —
   * `dashboardOrder` null (nunca arrastado, ou depois de "Restaurar ordem
   * automática") cai pro final, ordenado por updatedAt desc entre si (o
   * comportamento de sempre); um elenco arrastado ganha um
   * `dashboardOrder` e passa a vir antes de qualquer um ainda
   * não-arrastado dentro do mesmo grupo.
   */
  async listSquads() {
    return prisma.squad.findMany({
      orderBy: [{ dashboardOrder: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      include: {
        category: true,
        tags: true,
        _count: { select: { seasons: true } },
        seasons: {
          orderBy: { startYear: "desc" },
          take: 1,
          include: { _count: { select: { players: { where: { isWatchlist: false, isExtra: false, isDeparted: false } } } } },
        },
      },
    });
  },

  /** Grava a ordem exibida (índice da lista) em cada elenco — a lista inteira (de um grupo, ou geral) é reenviada a cada drag. */
  async reorderSquads(orderedIds: string[]) {
    await prisma.$transaction(orderedIds.map((id, index) => prisma.squad.update({ where: { id }, data: { dashboardOrder: index } })));
  },

  /** "Restaurar ordem automática" (§4) — volta pro updatedAt desc, sem apagar elenco nenhum. */
  async resetDashboardOrder() {
    await prisma.squad.updateMany({ data: { dashboardOrder: null } });
  },

  /**
   * Etapa 9 (§46) — Gerenciamento → Competições → Campeões: busca temporadas
   * já cadastradas pelo usuário (elenco real), pra vincular um campeão
   * histórico a um Squad/Season existente em vez de digitar tudo solto.
   * Deliberadamente NÃO filtra por Squad.baseKind mesmo quando a competição
   * já sabe se é de clube ou seleção (§42): baseKind só é setado quando o
   * elenco foi carregado de um clube/seleção real na criação — um elenco
   * "do zero" (bem comum: "Time dos Sonhos", clubes fictícios etc.) fica
   * com baseKind null pra sempre, e filtrar por ele esconderia justamente
   * esses elencos da busca sem nenhum motivo real (§47: "não esconder
   * opções à toa" vale mais do que a classificação ser 100% estrita aqui).
   */
  async searchSquadSeasons(query?: string) {
    const seasons = await prisma.season.findMany({
      where: {
        squad: {
          ...(query?.trim() && { name: { contains: query.trim(), mode: "insensitive" } }),
        },
      },
      select: {
        id: true,
        startYear: true,
        squad: { select: { id: true, name: true, logoUrl: true, baseKind: true, seasonCalendar: true } },
      },
      orderBy: [{ squad: { name: "asc" } }, { startYear: "desc" }],
      take: 50,
    });
    return seasons;
  },

  /** Etapa 10.1 (§3) — busca elencos (clube/seleção) pelo nome, pro SquadPicker (vincular "clube atual" a um jogador). Mesmo raciocínio de não filtrar por baseKind que searchSquadSeasons acima. */
  async searchSquads(query?: string) {
    return prisma.squad.findMany({
      where: query?.trim() ? { name: { contains: query.trim(), mode: "insensitive" } } : undefined,
      select: { id: true, name: true, logoUrl: true, baseKind: true },
      orderBy: { name: "asc" },
      take: 50,
    });
  },

  /**
   * Etapa 10.1 (§Parte 10) — listagem de clubes ou seleções pro
   * Gerenciamento (navegação/consulta, não duplica a criação/edição, que
   * continua só em Modo Clubes). `baseKind: null` conta como clube — um
   * elenco "do zero" nunca é seleção, então não faz sentido escondê-lo
   * da aba Clubes (mesmo raciocínio de searchSquadSeasons acima).
   */
  async listForManagement(kind: "club" | "nationalTeam") {
    return prisma.squad.findMany({
      where:
        kind === "nationalTeam"
          ? { baseKind: "nationalTeam" }
          : // SQL "<> 'nationalTeam'" exclui linhas com baseKind NULL (a
            // maioria dos clubes "do zero") — NULL não é considerado
            // diferente de nada em SQL. Precisa dos dois lados explícitos.
            { OR: [{ baseKind: null }, { baseKind: { not: "nationalTeam" } }] },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        category: { select: { name: true } },
        _count: { select: { seasons: true, currentPlayers: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  /** Club overview: identity + organizational metadata + the list of seasons (no player rosters — see seasonService.getSeason for that). */
  async getSquad(id: string) {
    return prisma.squad.findUnique({
      where: { id },
      include: {
        category: true,
        tags: true,
        seasons: {
          orderBy: { startYear: "desc" },
          include: {
            coach: true,
            // Etapa 10.1 (§7/§8) — torneio da convocação, quando definido.
            competition: true,
            _count: { select: { players: { where: { isWatchlist: false, isExtra: false, isDeparted: false } } } },
          },
        },
      },
    });
  },

  /** Etapa 10.2 — técnicos distintos que já passaram pelo clube (via Season.coachId), com os anos de cada um. Alimenta a aba "Técnicos". */
  async listCoachesUsed(squadId: string) {
    const seasons = await prisma.season.findMany({
      where: { squadId, coachId: { not: null } },
      select: { startYear: true, coach: { select: { id: true, name: true, photoUrl: true, externalLink: true } } },
      orderBy: { startYear: "desc" },
    });

    const byCoach = new Map<string, { coach: NonNullable<(typeof seasons)[number]["coach"]>; years: number[] }>();
    for (const season of seasons) {
      if (!season.coach) continue;
      const entry = byCoach.get(season.coach.id) ?? { coach: season.coach, years: [] };
      entry.years.push(season.startYear);
      byCoach.set(season.coach.id, entry);
    }

    return [...byCoach.values()];
  },

  /**
   * Etapa 10.2 — `Season` com `competitionId` setado (uma convocação, §
   * etapa 10.1), agrupadas por competição. Alimenta a árvore Seleção→
   * Competição→Convocação da aba "Competições" (seleção); cada convocação
   * já linka pra /squads/[id]/seasons/[seasonId] existente.
   */
  async listConvocationTree(squadId: string) {
    const seasons = await prisma.season.findMany({
      where: { squadId, competitionId: { not: null } },
      include: {
        competition: true,
        coach: true,
        _count: { select: { players: { where: { isWatchlist: false, isExtra: false, isDeparted: false } } } },
      },
      orderBy: { startYear: "desc" },
    });

    const byCompetition = new Map<
      string,
      { competition: NonNullable<(typeof seasons)[number]["competition"]>; convocations: typeof seasons }
    >();
    for (const season of seasons) {
      if (!season.competition) continue;
      const entry = byCompetition.get(season.competition.id) ?? { competition: season.competition, convocations: [] };
      entry.convocations.push(season);
      byCompetition.set(season.competition.id, entry);
    }

    return [...byCompetition.values()];
  },

  /**
   * Etapa 10.3 (§16/§17) — criação rápida de clube pelo
   * ClubDestinationPicker (transferência), diferente de `createSquad`:
   * cria SÓ o `Squad`, sem nenhuma Season — a arquitetura já suporta um
   * clube com zero temporadas (§7 etapa 10.1), então isso não é um estado
   * inválido novo. O usuário completa o resto (fundação, estádio, primeira
   * temporada real...) depois, no próprio perfil do clube, sem duplicar
   * nada.
   */
  async createBareSquad(input: { name: string; country?: string | null; logoUrl?: string | null }) {
    return prisma.squad.create({
      data: {
        name: input.name.trim(),
        baseKind: "club",
        country: input.country || null,
        logoUrl: input.logoUrl || null,
      },
    });
  },

  /**
   * Creates a club and its first season, optionally auto-loading the
   * season's base roster (§1: "carregando o elenco base automaticamente")
   * from a real club/national team.
   *
   * If loaded from a real club/national team, its badge/flag is copied
   * into `logoUrl` as a one-time convenience default — never re-fetched
   * live afterward (see updateSquad for editing it, including for
   * from-scratch clubs that never had one to begin with).
   */
  async createSquad(input: CreateSquadInput) {
    const resolved = input.base ? await resolveBase(input.base) : null;
    const formation = input.formation ?? "4-3-3";
    const tags = input.tagNames?.length ? await tagService.findOrCreateTags(input.tagNames) : [];
    const startYear = input.startYear ?? new Date().getFullYear();

    const squad = await prisma.squad.create({
      data: {
        name: input.name,
        baseClubRef: resolved?.externalId,
        baseKind: input.base?.kind ?? null,
        logoUrl: resolved?.logoUrl,
        categoryId: input.categoryId,
        tags: tags.length ? { connect: tags.map((t) => ({ id: t.id })) } : undefined,
      },
    });

    const season = await seasonService.createInitialSeason(squad.id, {
      startYear,
      formation,
      isNationalTeam: input.base?.kind === "nationalTeam",
      players: resolved?.players ?? [],
    });

    return { squad, season };
  },

  async updateSquad(
    id: string,
    data: {
      name?: string;
      logoUrl?: string | null;
      isFavorite?: boolean;
      categoryId?: string | null;
      /** Full replace: the club's tags become exactly this set (undefined leaves tags untouched). */
      tagNames?: string[];
      /**
       * "club" | "nationalTeam" | null — normally set once at creation and
       * left alone, but exposed as editable so a club created before this
       * concept existed can retroactively unlock the observados/elenco
       * ampliado areas without losing anything already customized on it.
       */
      baseKind?: string | null;
      /** Hex identity color (§12), or null to go back to the default theme. */
      primaryColor?: string | null;
      /** "brasileiro" | "europeu" — how this club's seasons are labeled. */
      seasonCalendar?: string;
      /** Etapa 10.2 — campos cadastrais pro perfil (aba "Visão Geral"), todos opcionais. */
      fullName?: string | null;
      country?: string | null;
      city?: string | null;
      foundedYear?: number | null;
      stadium?: string | null;
      colors?: string | null;
      confederation?: string | null;
    },
  ) {
    const { tagNames, ...rest } = data;
    const tags = tagNames !== undefined ? await tagService.findOrCreateTags(tagNames) : undefined;

    return prisma.squad.update({
      where: { id },
      data: {
        ...rest,
        tags: tags !== undefined ? { set: tags.map((t) => ({ id: t.id })) } : undefined,
      },
    });
  },

  async deleteSquad(id: string) {
    await prisma.squad.delete({ where: { id } });
  },

  /**
   * Clones a club's identity/settings AND every one of its seasons
   * (lineup, coach, formation, notes) — not the underlying player data,
   * since CachedPlayer is a read-only mirror (§7): every cloned season
   * ends up pointing at the exact same cachedPlayerId rows, only the
   * SquadPlayer "lineup" rows are duplicated, same as a single season's
   * own duplicate (seasonService.createSeason).
   */
  async duplicateSquad(id: string) {
    const original = await prisma.squad.findUnique({
      where: { id },
      include: {
        tags: true,
        seasons: {
          include: {
            players: true,
            titles: true,
            transfers: true,
            lineups: { orderBy: { order: "asc" }, include: { starters: true } },
          },
        },
      },
    });
    if (!original) return null;

    const copy = await prisma.squad.create({
      data: {
        name: `${original.name} (Cópia)`,
        baseClubRef: original.baseClubRef,
        baseKind: original.baseKind,
        logoUrl: original.logoUrl,
        primaryColor: original.primaryColor,
        seasonCalendar: original.seasonCalendar,
        categoryId: original.categoryId,
        tags: original.tags.length ? { connect: original.tags.map((t) => ({ id: t.id })) } : undefined,
      },
    });

    for (const season of original.seasons) {
      const newSeason = await prisma.season.create({
        data: {
          squadId: copy.id,
          startYear: season.startYear,
          formation: season.formation,
          // Coach agora é uma entidade compartilhada (§ nova etapa) — a
          // temporada clonada começa com o MESMO técnico (referência).
          coachId: season.coachId,
          notes: season.notes,
          wins: season.wins,
          draws: season.draws,
          losses: season.losses,
        },
      });

      // squadPlayerId (temporada ORIGEM) → cachedPlayerId, pra remapear os
      // titulares de cada escalação copiada abaixo pro SquadPlayer novo do
      // mesmo jogador — mesmo raciocínio de season.service.ts#createSeason.
      const sourceIdToCachedPlayerId = new Map(season.players.map((p) => [p.id, p.cachedPlayerId]));
      let newIdByCachedPlayerId = new Map<string, string>();

      if (season.players.length > 0) {
        await prisma.squadPlayer.createMany({
          data: season.players.map((p) => ({
            seasonId: newSeason.id,
            cachedPlayerId: p.cachedPlayerId,
            shirtNumber: p.shirtNumber,
            isCaptain: p.isCaptain,
            isYouth: p.isYouth,
            isStarter: p.isStarter,
            isWatchlist: p.isWatchlist,
            isExtra: p.isExtra,
            isDeparted: p.isDeparted,
            positionSlot: p.positionSlot,
            order: p.order,
          })),
        });

        const created = await prisma.squadPlayer.findMany({
          where: { seasonId: newSeason.id },
          select: { id: true, cachedPlayerId: true },
        });
        newIdByCachedPlayerId = new Map(created.map((p) => [p.cachedPlayerId, p.id]));

        // Mesmo bug/correção já aplicada em season.service.ts#createSeason
        // (duplicar UMA temporada): duplicar o clube INTEIRO também cria
        // SquadPlayer via createMany direto, sem passar por
        // ensureCareerStintForSeason — um jogador copiado pro clube clonado
        // nunca ganhava a passagem correspondente na carreira dele.
        await Promise.all(
          season.players.map((p) => ensureCareerStintForSeason(p.cachedPlayerId, newSeason.id)),
        );
      }

      // Clone completo: toda escalação salva desta temporada também é
      // clonada (mesmo raciocínio de títulos/transferências abaixo).
      for (const sourceLineup of season.lineups) {
        const newLineup = await prisma.squadLineup.create({
          data: { seasonId: newSeason.id, name: sourceLineup.name, formation: sourceLineup.formation, order: sourceLineup.order },
        });

        const starterRows = sourceLineup.starters.flatMap((st) => {
          const cachedPlayerId = sourceIdToCachedPlayerId.get(st.squadPlayerId);
          const newSquadPlayerId = cachedPlayerId ? newIdByCachedPlayerId.get(cachedPlayerId) : undefined;
          if (!newSquadPlayerId) return [];
          return [{ lineupId: newLineup.id, squadPlayerId: newSquadPlayerId, positionSlot: st.positionSlot, xOffset: st.xOffset, yOffset: st.yOffset }];
        });
        if (starterRows.length > 0) await prisma.squadLineupStarter.createMany({ data: starterRows });
      }

      // This is a full historical clone of the club (unlike duplicating a
      // single season into a new year — seasonService.createSeason — which
      // deliberately starts titles/transfers blank for a season that
      // hasn't happened yet), so what already happened in each season
      // (titles, transfers) is copied along with it.
      if (season.titles.length > 0) {
        await prisma.seasonTitle.createMany({
          data: season.titles.map((t) => ({ seasonId: newSeason.id, competitionId: t.competitionId })),
        });
      }
      if (season.transfers.length > 0) {
        await prisma.transfer.createMany({
          data: season.transfers.map((t) => ({
            seasonId: newSeason.id,
            type: t.type,
            playerName: t.playerName,
            counterpartClub: t.counterpartClub,
            value: t.value,
            order: t.order,
          })),
        });
      }
    }

    return squadService.getSquad(copy.id);
  },

  /**
   * Aggregated palmarés across every season of this club (§3) — always
   * computed fresh from SeasonTitle rows, never a stored total, so it can
   * never drift out of sync with what each season actually shows.
   */
  async getPalmares(squadId: string) {
    const titles = await prisma.seasonTitle.findMany({
      where: { season: { squadId } },
      include: { competition: true },
    });

    const byCompetition = new Map<string, { competition: (typeof titles)[number]["competition"]; count: number }>();
    for (const title of titles) {
      const entry = byCompetition.get(title.competitionId);
      if (entry) entry.count += 1;
      else byCompetition.set(title.competitionId, { competition: title.competition, count: 1 });
    }

    return [...byCompetition.values()].sort(
      (a, b) => b.count - a.count || a.competition.name.localeCompare(b.competition.name),
    );
  },

  /**
   * §7/§8: artilheiros/assistências/jogos históricos do clube, somando
   * PlayerCompetitionStats de TODAS as temporadas — sempre calculado, nunca
   * digitado. Agrupado por `cachedPlayerId` (não por SquadPlayer.id, que é
   * um registro novo a cada temporada/duplicação): um jogador real
   * pesquisado/carregado de novo, ou carregado via "duplicar temporada",
   * reaproveita o mesmo CachedPlayer — é isso que reconhece "é o mesmo
   * jogador" entre temporadas sem precisar de nenhuma estrutura nova (§10).
   * Um jogador customizado cadastrado à mão de novo em cada temporada,
   * sem nunca ter vindo de uma duplicação, é tratado como pessoas
   * diferentes — consistente com como o resto do app já funciona.
   */
  /**
   * Etapa 10.1 (§3) — jogadores cujo "clube atual" (CachedPlayer.
   * currentClubId) é este elenco. Independente de temporada/elenco: um
   * jogador pode estar aqui sem nunca ter sido escalado em nenhuma
   * temporada (cadastro solto vinculado ao clube), e vice-versa (um
   * jogador com passagens antigas aqui pode já não ter mais este clube
   * como atual).
   */
  async listCurrentPlayers(squadId: string) {
    return prisma.cachedPlayer.findMany({
      where: { currentClubId: squadId },
      select: { id: true, name: true, photoUrl: true, position: true, nationality: true, overall: true },
      orderBy: { name: "asc" },
    });
  },

  /**
   * Etapa 10.5 — wrapper fino sobre statisticsService.getPlayerAggregates
   * (o mesmo motor de agregação global do Centro de Estatísticas, só
   * filtrado por squadId): mesma assinatura e mesmo formato de retorno
   * de sempre, ninguém que já chama isso precisa mudar. Evita ter duas
   * implementações fazendo a mesma soma de PlayerCompetitionStats — uma
   * "por clube" e outra "global" (§14 da etapa 10.5).
   */
  async getHistoricalStats(squadId: string, limit?: number) {
    const all = await statisticsService.getPlayerAggregates({ squadId });

    // Mesmo desempate de lib/statistics.ts#sortPlayerAggregates (métrica
    // DESC, jogos DESC, nome ASC) — achado pelo QA: antes esta função
    // ordenava só pela métrica principal, sem desempate, então a ordem
    // podia divergir da página global pra jogadores empatados mesmo os
    // números batendo. Reaproveita a mesma função em vez de reimplementar
    // o desempate aqui.
    const topN = (metric: "goals" | "assists" | "appearances") => {
      const sorted = sortPlayerAggregates(all, metric);
      return limit === undefined ? sorted : sorted.slice(0, limit);
    };

    return {
      topScorers: topN("goals"),
      topAssists: topN("assists"),
      mostAppearances: topN("appearances"),
    };
  },

  /** Etapa 10.5 — wrapper fino sobre statisticsService.getBiggestPurchases/getBiggestSales, mesma assinatura/retorno de sempre. */
  async getTopTransfers(squadId: string, limit?: number) {
    const [topBuys, topSales] = await Promise.all([
      statisticsService.getBiggestPurchases({ squadId, limit }),
      statisticsService.getBiggestSales({ squadId, limit }),
    ]);
    return { topBuys, topSales };
  },
};
