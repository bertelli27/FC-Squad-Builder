import { prisma } from "@/lib/prisma";
import { cacheRepository } from "@/repositories/cache.repository";
import { competitionService } from "./competition.service";
import { seasonService, ensureCareerStintForSeason } from "./season.service";

function fetchCareerRaw(id: string) {
  return prisma.playerCareer.findUnique({
    where: { id },
    include: {
      cachedPlayer: true,
      stints: {
        include: {
          titles: { include: { competition: true } },
          competitionStats: { include: { competition: true }, orderBy: { competition: { name: "asc" } } },
          season: {
            select: {
              id: true,
              squadId: true,
              titles: { include: { competition: true }, orderBy: { createdAt: "asc" } },
            },
          },
        },
        orderBy: { order: "asc" },
      },
      transfers: { orderBy: { order: "asc" } },
    },
  });
}

/**
 * CORREÇÃO — visão geral não consolidava dados de passagens vinculadas a
 * uma temporada real: desde a etapa 8/§29, um stint com `seasonId` mostra
 * jogos/gols/assistências/títulos direto da temporada do clube (ver
 * club-stint-card.tsx/career-stint-page-content.tsx — "esses dados agora
 * vivem na página da temporada"), então os campos próprios do CareerStint
 * (appearances/goals/assists, sempre 0) e CareerTitle (sempre vazio) nunca
 * são preenchidos para esses stints — só para os "soltos" (criados na mão,
 * sem clube/temporada real vinculados). A "Visão geral" (career-workspace.
 * tsx) e stintTotals() (lib/career.ts) sempre leram só esses campos
 * próprios, então pareciam zerados para qualquer passagem vinculada.
 *
 * Aqui não muda nem stintTotals nem a agregação da workspace: só decora,
 * uma vez por fetch, o `appearances/goals/assists`/`competitionStats`/
 * `titles` de cada stint vinculado com os valores REAIS (PlayerCompetition
 * Stats do SquadPlayer da temporada / SeasonTitle da temporada) — a mesma
 * fonte que a página da própria temporada já usa. `competitionStats`
 * também precisa ser decorado (não só o total achatado): stintTotals()
 * usa exatamente esse array pra somar quando kind === "nationalTeam", em
 * vez dos campos achatados (só clube usa esses). Nada é persistido: é uma
 * leitura derivada a cada fetch, igual o resto do projeto já faz pra
 * totais (nunca grava um total, sempre soma sob demanda). Stints sem
 * `seasonId` continuam exatamente como estavam (não têm season pra puxar
 * dado nenhum).
 */
async function decorateLinkedStints(career: NonNullable<Awaited<ReturnType<typeof fetchCareerRaw>>>) {
  const cachedPlayerId = career.cachedPlayerId;
  const linkedSeasonIds = career.stints.filter((s) => s.season).map((s) => s.season!.id);
  if (!cachedPlayerId || linkedSeasonIds.length === 0) return career;

  const squadPlayers = await prisma.squadPlayer.findMany({
    where: { seasonId: { in: linkedSeasonIds }, cachedPlayerId },
    include: { competitionStats: { include: { competition: true }, orderBy: { competition: { name: "asc" } } } },
  });
  const squadPlayerBySeasonId = new Map(squadPlayers.map((sp) => [sp.seasonId, sp]));

  return {
    ...career,
    stints: career.stints.map((stint) => {
      if (!stint.season) return stint;

      const squadPlayer = squadPlayerBySeasonId.get(stint.season.id);
      const effective = (squadPlayer?.competitionStats ?? []).reduce(
        (acc, s) => ({
          appearances: acc.appearances + s.appearances,
          goals: acc.goals + s.goals,
          assists: acc.assists + s.assists,
        }),
        { appearances: 0, goals: 0, assists: 0 },
      );

      return {
        ...stint,
        appearances: effective.appearances,
        goals: effective.goals,
        assists: effective.assists,
        competitionStats: squadPlayer?.competitionStats ?? [],
        titles: stint.season.titles,
      };
    }),
  };
}

/**
 * Standalone (see season.service.ts's getSeasonById for why) so other
 * methods below can reference its return type without a circular
 * `typeof careerService` self-reference.
 */
async function getCareerById(id: string) {
  const career = await fetchCareerRaw(id);
  return career ? decorateLinkedStints(career) : null;
}

async function nextOrder(careerId: string): Promise<number> {
  const [stintMax, transferMax] = await Promise.all([
    prisma.careerStint.aggregate({ where: { careerId }, _max: { order: true } }),
    prisma.careerTransfer.aggregate({ where: { careerId }, _max: { order: true } }),
  ]);
  return Math.max(stintMax._max.order ?? -1, transferMax._max.order ?? -1) + 1;
}

export const careerService = {
  /**
   * CORREÇÃO — mesmo princípio da visão geral (career-workspace.tsx,
   * seasonsByYear): "temporadas" é o número de ANOS distintos, não de
   * CareerStints. Um jogador com clube + seleção no mesmo ano tinha
   * `_count.stints` contando 2 em vez de 1. Calculado aqui (não com
   * `_count`, que só sabe contar linhas) buscando só `startYear` de cada
   * stint e reduzindo a um Set — nenhum CareerStint é alterado.
   */
  async listCareers() {
    const careers = await prisma.playerCareer.findMany({
      orderBy: { updatedAt: "desc" },
      include: { cachedPlayer: true, stints: { select: { startYear: true } } },
    });
    return careers.map((career) => ({
      ...career,
      seasonCount: new Set(career.stints.map((s) => s.startYear)).size,
    }));
  },

  getCareer: getCareerById,

  /**
   * §14: `playerRef` (source+externalId, from the same player search used
   * everywhere else — see add-player-dialog.tsx) resolves to an existing
   * CachedPlayer instead of creating a disconnected identity when the
   * player is already known.
   *
   * Etapa 6 (§16/§24/§32): `cachedPlayerId` is now always set, even without
   * a `playerRef` — a fresh "custom" CachedPlayer is minted for freeform
   * careers, the same way createCustomPlayer already does for squads. This
   * guarantees every career has one central, editable player record ("Editar
   * jogador" always has something concrete to point at), instead of the
   * name/photo living nowhere but this row. `name`/`photoUrl` below stay as
   * the values passed at creation, but callers should prefer
   * `cachedPlayer.name`/`cachedPlayer.photoUrl` once "Editar jogador" can
   * change them — see getCareerById's include.
   */
  async createCareer(input: {
    name: string;
    photoUrl?: string | null;
    playerRef?: { source: string; externalId: string };
  }) {
    let cachedPlayerId: string | undefined;
    let photoUrl = input.photoUrl ?? undefined;
    if (input.playerRef) {
      const cached = await cacheRepository.getPlayer(input.playerRef.source, input.playerRef.externalId);
      if (cached) {
        cachedPlayerId = cached.id;
        if (!photoUrl) photoUrl = cached.photoUrl ?? undefined;
      }
    }
    if (!cachedPlayerId) {
      // Same "custom" source/shape createCustomPlayer uses for squads
      // (season.service.ts) — a career-only player is just as much a
      // user-authored identity as a squad-only one.
      const cached = await cacheRepository.upsertPlayer("custom", crypto.randomUUID(), {
        name: input.name,
        photoUrl,
        rawData: { custom: true },
        expiresAt: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
      });
      cachedPlayerId = cached.id;
    }
    return prisma.playerCareer.create({ data: { name: input.name, photoUrl, cachedPlayerId } });
  },

  async updateCareer(id: string, data: { name?: string; photoUrl?: string | null; summary?: string | null }) {
    return prisma.playerCareer.update({ where: { id }, data });
  },

  async deleteCareer(id: string) {
    await prisma.playerCareer.delete({ where: { id } });
  },

  /**
   * Adds a stint — either linked to an existing club Season (§5/§6: copies
   * its club name/logo/year/calendar once so they don't need retyping,
   * and so the stint survives even if that Season is later deleted — see
   * schema.prisma's comment on CareerStint) or fully manual for a club
   * that was never modeled in the Clubes module.
   *
   * Etapa 8 (§6/§43/§44): linking to a real Season now also makes the
   * player a real member of that season's roster — not just a visual
   * entry in the career timeline. `transferIn`, when provided, records
   * this as a real transfer instead of a plain roster add (reusing
   * seasonService.signPlayer verbatim, which already creates the real
   * Transfer AND mirrors it onto this same career — see season.service.ts
   * §22/§23 etapa 7 — so this never builds a second transfer system).
   *
   * CORREÇÃO — sincronização bidirecional: signPlayer/addPlayerToSeason
   * chamados abaixo já criam a CareerStint por conta própria (via
   * ensureCareerStintForSeason, disparada também quando o jogador é
   * adicionado direto pelo Modo Clubes — essa é a correção). Por isso este
   * método NUNCA cria a CareerStint diretamente no caminho vinculado a uma
   * Season: ele só chama a mesma função idempotente para obter (ou, no caso
   * raro de a carreira não ter cachedPlayer, criar) a linha certa — assim
   * não existe ordem de execução que resulte em duas CareerStint para o
   * mesmo par (carreira, temporada).
   */
  async addStint(
    careerId: string,
    input: {
      kind?: "club" | "nationalTeam";
      seasonId?: string;
      clubName?: string;
      clubLogoUrl?: string;
      startYear?: number;
      calendar?: string;
      transferIn?: { counterpartClub?: string; value?: number; dealType?: "permanent" | "loan" };
    },
  ) {
    if (input.seasonId) {
      const season = await prisma.season.findUnique({
        where: { id: input.seasonId },
        include: { squad: true },
      });
      if (!season) return null;

      const career = await prisma.playerCareer.findUnique({
        where: { id: careerId },
        include: { cachedPlayer: true },
      });
      if (career?.cachedPlayer) {
        const playerRef = { source: career.cachedPlayer.source, externalId: career.cachedPlayer.externalId };
        if (input.transferIn) {
          await seasonService.signPlayer(season.id, { playerRef, ...input.transferIn });
        } else {
          await seasonService.addPlayerToSeason(season.id, playerRef, "bench");
        }

        const stint = await ensureCareerStintForSeason(career.cachedPlayer.id, season.id);
        if (!stint) return null;
        return prisma.careerStint.findUnique({
          where: { id: stint.id },
          include: {
            titles: { include: { competition: true } },
            competitionStats: { include: { competition: true } },
          },
        });
      }

      // Carreira sem cachedPlayer (não deveria acontecer desde a etapa 6,
      // que garante um sempre existir) — fallback direto, sem elenco.
      const order = await nextOrder(careerId);
      return prisma.careerStint.create({
        data: {
          careerId,
          seasonId: season.id,
          kind: season.squad.baseKind === "nationalTeam" ? "nationalTeam" : "club",
          clubName: season.squad.name,
          clubLogoUrl: season.squad.logoUrl,
          startYear: season.startYear,
          calendar: season.squad.seasonCalendar,
          order,
        },
        include: {
          titles: { include: { competition: true } },
          competitionStats: { include: { competition: true } },
        },
      });
    }

    const { clubName, clubLogoUrl, startYear } = input;
    const calendar = input.calendar ?? "brasileiro";
    const kind = input.kind ?? "club";
    if (!clubName?.trim() || startYear === undefined) return null;

    const order = await nextOrder(careerId);
    return prisma.careerStint.create({
      data: { careerId, kind, clubName, clubLogoUrl, startYear, calendar, order },
      include: {
        titles: { include: { competition: true } },
        competitionStats: { include: { competition: true } },
      },
    });
  },

  /**
   * §29-§36: everything a stint's own detail page needs. When linked to a
   * real Season, `squadPlayer` is the exact row PlayerStatsSection already
   * knows how to read/edit (§18/§19/§47 — same data, same component, no
   * second stats system) and `stint.season.titles` are that season's real
   * SeasonTitle rows (§20/§21/§48 — no per-player title invented). Both are
   * null/empty for an unlinked stint, which falls back to CareerStint's own
   * flat fields / CareerTitle — unchanged since etapa 4/5.
   */
  async getStintDetail(stintId: string) {
    const stint = await prisma.careerStint.findUnique({
      where: { id: stintId },
      include: {
        career: { include: { cachedPlayer: true } },
        titles: { include: { competition: true } },
        competitionStats: { include: { competition: true }, orderBy: { competition: { name: "asc" } } },
        season: {
          include: {
            squad: true,
            titles: { include: { competition: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
    if (!stint) return null;

    let squadPlayer = null;
    if (stint.season && stint.career.cachedPlayerId) {
      squadPlayer = await prisma.squadPlayer.findUnique({
        where: {
          seasonId_cachedPlayerId: { seasonId: stint.season.id, cachedPlayerId: stint.career.cachedPlayerId },
        },
      });
    }

    return { stint, squadPlayer };
  },

  async updateStint(
    stintId: string,
    data: {
      clubName?: string;
      clubLogoUrl?: string | null;
      startYear?: number;
      calendar?: string;
      appearances?: number;
      goals?: number;
      assists?: number;
      summary?: string | null;
    },
  ) {
    return prisma.careerStint.update({ where: { id: stintId }, data });
  },

  async removeStint(careerId: string, stintId: string) {
    await prisma.careerStint.delete({ where: { id: stintId, careerId } });
  },

  /** Same resolve-or-create-competition pattern as seasonService.addTitle. */
  async addStintTitle(
    stintId: string,
    input: { competitionId?: string; competitionName?: string; trophyImageUrl?: string | null },
  ) {
    let competitionId = input.competitionId;
    if (!competitionId) {
      if (!input.competitionName?.trim()) return null;
      const competition = await competitionService.findOrCreateCompetition(
        input.competitionName,
        input.trophyImageUrl,
      );
      competitionId = competition.id;
    }

    const existing = await prisma.careerTitle.findUnique({
      where: { stintId_competitionId: { stintId, competitionId } },
      include: { competition: true },
    });
    if (existing) return existing;

    return prisma.careerTitle.create({
      data: { stintId, competitionId },
      include: { competition: true },
    });
  },

  async removeStintTitle(stintId: string, titleId: string) {
    await prisma.careerTitle.delete({ where: { id: titleId, stintId } });
  },

  /**
   * §3/§4: starts tracking a competition for a national-team stint (zeroed
   * row) — same resolve-or-create-competition + idempotent-per-competition
   * pattern as addStintTitle/seasonService.addTitle/playerStatsService.
   */
  async addStintCompetitionStats(
    stintId: string,
    input: { competitionId?: string; competitionName?: string },
  ) {
    let competitionId = input.competitionId;
    if (!competitionId) {
      if (!input.competitionName?.trim()) return null;
      const competition = await competitionService.findOrCreateCompetition(input.competitionName);
      competitionId = competition.id;
    }

    const existing = await prisma.careerStintCompetitionStats.findUnique({
      where: { stintId_competitionId: { stintId, competitionId } },
      include: { competition: true },
    });
    if (existing) return existing;

    return prisma.careerStintCompetitionStats.create({
      data: { stintId, competitionId },
      include: { competition: true },
    });
  },

  async updateStintCompetitionStats(
    statsId: string,
    data: { appearances?: number; goals?: number; assists?: number },
  ) {
    return prisma.careerStintCompetitionStats.update({ where: { id: statsId }, data });
  },

  async removeStintCompetitionStats(stintId: string, statsId: string) {
    await prisma.careerStintCompetitionStats.delete({ where: { id: statsId, stintId } });
  },

  /** §2/§3: a "Clube A → Clube B, €valor" event sitting in the timeline between two stints. */
  async addTransfer(
    careerId: string,
    input: { fromClubName?: string; toClubName: string; value?: number; year: number },
  ) {
    const order = await nextOrder(careerId);
    return prisma.careerTransfer.create({
      data: {
        careerId,
        fromClubName: input.fromClubName?.trim() || null,
        toClubName: input.toClubName.trim(),
        value: input.value ?? null,
        year: input.year,
        order,
      },
    });
  },

  async removeTransfer(careerId: string, transferId: string) {
    await prisma.careerTransfer.delete({ where: { id: transferId, careerId } });
  },

  /**
   * §26 second half: "Ver carreira" from a club's player profile — only
   * for players who actually have one (a career is opt-in, most players
   * in a real roster won't). One batched query per season page load
   * instead of N+1.
   */
  async findCareerIdsByCachedPlayerIds(cachedPlayerIds: string[]): Promise<Map<string, string>> {
    if (cachedPlayerIds.length === 0) return new Map();
    const careers = await prisma.playerCareer.findMany({
      where: { cachedPlayerId: { in: cachedPlayerIds } },
      select: { id: true, cachedPlayerId: true },
    });
    return new Map(careers.filter((c) => c.cachedPlayerId).map((c) => [c.cachedPlayerId as string, c.id]));
  },
};
