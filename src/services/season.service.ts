import { prisma } from "@/lib/prisma";
import { cacheRepository } from "@/repositories/cache.repository";
import { getFormationSlots } from "@/lib/formations";
import { normalizePositionCategory } from "@/lib/position-category";
import { playerDataService } from "./player-data.service";
import { competitionService } from "./competition.service";
import { NATIONAL_TEAM_SQUAD_SIZE } from "@/lib/national-team";
import { KIT_TYPES } from "@/lib/kits";
import type { Player } from "@/types/domain";

interface SquadPlayerAssignment {
  cachedPlayerId: string;
  positionSlot: string | null;
  isStarter: boolean;
  order: number;
}

/**
 * Greedily fills each formation slot with the best remaining player whose
 * position matches the slot's category (GK/DEF/MID/ATT), falling back to
 * any remaining player if the category is exhausted. Whatever's left over
 * becomes the bench. Not an optimal assignment (no swapping to fix a
 * mismatch elsewhere) — good enough for an initial lineup the user then
 * edits by hand in the tactical editor.
 */
function assignStartingXI(
  players: { cachedPlayerId: string; position?: string; overall?: number }[],
  formation: string,
): SquadPlayerAssignment[] {
  const pool = players
    .map((p) => ({ ...p, category: normalizePositionCategory(p.position) }))
    .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));

  const used = new Set<number>();
  const starters: SquadPlayerAssignment[] = [];

  getFormationSlots(formation).forEach((slot, order) => {
    let index = pool.findIndex((p, i) => !used.has(i) && p.category === slot.category);
    if (index === -1) index = pool.findIndex((_, i) => !used.has(i));
    if (index === -1) return;

    used.add(index);
    starters.push({
      cachedPlayerId: pool[index].cachedPlayerId,
      positionSlot: slot.slot,
      isStarter: true,
      order,
    });
  });

  const bench: SquadPlayerAssignment[] = pool
    .filter((_, i) => !used.has(i))
    .map((p, i) => ({
      cachedPlayerId: p.cachedPlayerId,
      positionSlot: null,
      isStarter: false,
      order: starters.length + i,
    }));

  return [...starters, ...bench];
}

/**
 * Manual additions respect the same 26-man cap as the automatic load
 * (§ createInitialSeason): once a national-team season already has 26
 * official members (starter or bench, i.e. neither watchlist nor extra), a
 * new bench-bound addition becomes an "extra" instead. Watchlist additions
 * are never capped — observados were never part of the 26 to begin with.
 */
async function resolveDestinationBucket(
  seasonId: string,
  destination: "bench" | "watchlist",
): Promise<{ isWatchlist: boolean; isExtra: boolean }> {
  if (destination === "watchlist") return { isWatchlist: true, isExtra: false };

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { squad: { select: { baseKind: true } } },
  });
  if (season?.squad.baseKind !== "nationalTeam") return { isWatchlist: false, isExtra: false };

  const officialCount = await prisma.squadPlayer.count({
    where: { seasonId, isWatchlist: false, isExtra: false, isDeparted: false },
  });
  return { isWatchlist: false, isExtra: officialCount >= NATIONAL_TEAM_SQUAD_SIZE };
}

/** Shared by mirrorTransferOnCareer and ensureCareerStintForSeason below — both append to the same timeline sequence. */
async function nextCareerOrder(careerId: string): Promise<number> {
  const [stintMax, transferMax] = await Promise.all([
    prisma.careerStint.aggregate({ where: { careerId }, _max: { order: true } }),
    prisma.careerTransfer.aggregate({ where: { careerId }, _max: { order: true } }),
  ]);
  return Math.max(stintMax._max.order ?? -1, transferMax._max.order ?? -1) + 1;
}

/**
 * §22/§23: mirrors a club-side Transfer into the player's PlayerCareer, if
 * they have one linked to the same CachedPlayer — a no-op otherwise (a
 * career is opt-in, most players don't have one). Copied once at creation,
 * same "reference not sync" principle as CareerStint.seasonId: later
 * edits/deletes of the source Transfer never touch this row.
 */
async function mirrorTransferOnCareer(
  transferId: string,
  cachedPlayerId: string,
  input: { fromClubName: string | null; toClubName: string; value: number | null; year: number },
) {
  const career = await prisma.playerCareer.findFirst({ where: { cachedPlayerId } });
  if (!career) return;

  const order = await nextCareerOrder(career.id);

  await prisma.careerTransfer.create({
    data: {
      careerId: career.id,
      fromClubName: input.fromClubName,
      toClubName: input.toClubName,
      value: input.value,
      year: input.year,
      order,
      sourceTransferId: transferId,
    },
  });
}

/**
 * CORREÇÃO — sincronização bidirecional: até agora só existia a direção
 * carreira → clube (career.service.ts#addStint criava o SquadPlayer). Um
 * jogador adicionado a um elenco diretamente pelo Modo Clubes
 * (addPlayerToSeason/createCustomPlayer/signPlayer) nunca refletia na
 * carreira dele, mesmo já tendo uma. Esta função é a única responsável
 * por criar esse vínculo, chamada dos dois lados — tanto daqui (clube →
 * carreira) quanto de career.service.ts#addStint (carreira → clube, que
 * internamente chama signPlayer/addPlayerToSeason e por isso já dispara
 * esta mesma função) — então não importa qual lado agiu primeiro, o
 * `findFirst` abaixo garante que nunca se cria uma segunda CareerStint
 * para o mesmo par (carreira, temporada). Não faz nada se o jogador não
 * tiver carreira (a maioria não tem — carreira é opt-in, §"não quero uma
 * integração automática de todos os jogadores existentes").
 */
export async function ensureCareerStintForSeason(cachedPlayerId: string, seasonId: string) {
  const career = await prisma.playerCareer.findFirst({ where: { cachedPlayerId } });
  if (!career) return null;

  const existing = await prisma.careerStint.findFirst({ where: { careerId: career.id, seasonId } });
  if (existing) return existing;

  const season = await prisma.season.findUnique({ where: { id: seasonId }, include: { squad: true } });
  if (!season) return null;

  const order = await nextCareerOrder(career.id);
  return prisma.careerStint.create({
    data: {
      careerId: career.id,
      seasonId: season.id,
      kind: season.squad.baseKind === "nationalTeam" ? "nationalTeam" : "club",
      clubName: season.squad.name,
      clubLogoUrl: season.squad.logoUrl,
      startYear: season.startYear,
      calendar: season.squad.seasonCalendar,
      order,
    },
  });
}

/**
 * Standalone (not a `seasonService` method) so `createSeason`'s return type
 * below can reference its result without a circular `typeof seasonService`
 * self-reference — TypeScript can't infer an object literal's own type
 * while a property inside it depends on that same type.
 */
function getSeasonById(id: string) {
  return prisma.season.findUnique({
    where: { id },
    include: {
      squad: true,
      coach: true,
      // Etapa 10.1 (§7/§8) — torneio pra qual esta temporada é a
      // convocação, quando definido (null pra clube e pra seleção sem
      // torneio específico).
      competition: true,
      // isDeparted: false — elenco ativo apenas (§10-14); um jogador
      // transferido/vendido não aparece mais aqui, mas a linha dele
      // (com as estatísticas) continua existindo no banco.
      players: { where: { isDeparted: false }, include: { cachedPlayer: true }, orderBy: { order: "asc" } },
      titles: { include: { competition: true }, orderBy: { createdAt: "asc" } },
      transfers: { orderBy: { order: "asc" } },
      kits: true,
      competitions: { include: { competition: true }, orderBy: { order: "asc" } },
      // Etapa "escalações múltiplas" — todas as escalações salvas desta
      // temporada, cada uma com seus próprios titulares. A "padrão"
      // (mostrada primeiro, usada pro badge de formação fora da
      // temporada) é sempre a de menor `order` — ver comentário no
      // schema.
      lineups: { orderBy: { order: "asc" }, include: { starters: true } },
    },
  });
}

export const seasonService = {
  async listSeasons(squadId: string) {
    return prisma.season.findMany({
      where: { squadId },
      orderBy: { startYear: "desc" },
      include: { _count: { select: { players: { where: { isWatchlist: false, isExtra: false, isDeparted: false } } } } },
    });
  },

  getSeason: getSeasonById,

  /**
   * Jogadores que já saíram desta temporada (isDeparted) — invisíveis em
   * `getSeasonById`'s `season.players` de propósito (elenco ativo), mas a
   * linha (e as estatísticas) continuam existindo. Usado só pela
   * Transferências card pra oferecer um jeito de reabrir o perfil/
   * estatísticas de alguém que já saiu (§"estatísticas depois da saída").
   */
  async listDepartedPlayers(seasonId: string) {
    return prisma.squadPlayer.findMany({
      where: { seasonId, isDeparted: true },
      include: { cachedPlayer: true },
    });
  },

  /**
   * The season created alongside a brand-new club (§squad.service.ts
   * createSquad) — optionally auto-loading a real club/national team's
   * roster and assigning a starting XI, same greedy logic `changeFormation`
   * reuses later. A real national team's registered squad is easily
   * 30-40+ names (not just the current 26-man call-up), so anything past
   * NATIONAL_TEAM_SQUAD_SIZE becomes an "extra" instead of dumping the
   * whole pool onto the bench; club seasons are uncapped.
   */
  async createInitialSeason(
    squadId: string,
    input: { startYear: number; formation: string; isNationalTeam: boolean; players: Player[] },
  ) {
    const season = await prisma.season.create({
      data: { squadId, startYear: input.startYear, formation: input.formation },
    });
    // Etapa "escalações múltiplas" — toda temporada nasce com uma
    // escalação ("Formação 1"), nunca "sem nenhuma" — é nela que o
    // starting XI abaixo é registrado.
    const lineup = await prisma.squadLineup.create({
      data: { seasonId: season.id, name: "Formação 1", formation: input.formation, order: 0 },
    });

    if (input.players.length > 0) {
      const cachedRows = await Promise.all(
        input.players.map((p) => cacheRepository.getPlayer(p.source, p.externalId)),
      );
      const validRows = cachedRows.filter((row) => row !== null);

      const assignments = assignStartingXI(
        validRows.map((row) => ({
          cachedPlayerId: row.id,
          position: row.position ?? undefined,
          overall: row.overall ?? undefined,
        })),
        input.formation,
      );

      const cap = input.isNationalTeam ? NATIONAL_TEAM_SQUAD_SIZE : Infinity;

      if (assignments.length > 0) {
        await prisma.squadPlayer.createMany({
          data: assignments.map((a, i) => ({
            seasonId: season.id,
            cachedPlayerId: a.cachedPlayerId,
            positionSlot: i < cap ? a.positionSlot : null,
            isStarter: i < cap && a.isStarter,
            isExtra: i >= cap,
            order: a.order,
          })),
        });

        const created = await prisma.squadPlayer.findMany({
          where: { seasonId: season.id },
          select: { id: true, cachedPlayerId: true },
        });
        const idByCachedPlayerId = new Map(created.map((p) => [p.cachedPlayerId, p.id]));

        const starters = assignments
          .filter((a, i) => i < cap && a.isStarter && a.positionSlot)
          .map((a) => ({
            lineupId: lineup.id,
            squadPlayerId: idByCachedPlayerId.get(a.cachedPlayerId)!,
            positionSlot: a.positionSlot!,
          }));
        if (starters.length > 0) await prisma.squadLineupStarter.createMany({ data: starters });
      }
    }

    return season;
  },

  /**
   * A season built from scratch, or based on another season of the same
   * club (§6 "duplicar temporada"): copies the lineup/coach/formation as a
   * starting point the user then edits — new, independent SquadPlayer
   * rows, never a reference back to the source (editing 2027 must never
   * touch 2026). `notes` is deliberately NOT copied: it reads more like a
   * season-specific summary/journal (in the same spirit as the stats/
   * títulos/transferências §7 explicitly keeps out of duplication) than
   * part of the roster's "base" worth reusing.
   */
  async createSeason(
    squadId: string,
    input: { startYear: number; duplicateFromSeasonId?: string; competitionId?: string },
  ): Promise<
    | { season: NonNullable<Awaited<ReturnType<typeof getSeasonById>>> }
    | { error: "duplicate-year" | "source-not-found" }
  > {
    // Etapa 10.1 (§7/§8) — clube continua "só uma temporada por ano"
    // (competitionId nunca vem preenchido pra clube, então esta checagem
    // sozinha já reproduz a trava de sempre pra eles); seleção pode
    // repetir o ano quando é pra um torneio diferente — só barra a
    // combinação EXATA (mesmo ano + mesmo torneio, ou mesmo ano + nenhum
    // torneio) de novo. Ver comentário no schema.prisma sobre por que
    // isso não é mais uma constraint de banco.
    const clash = await prisma.season.findFirst({
      where: { squadId, startYear: input.startYear, competitionId: input.competitionId ?? null },
    });
    if (clash) return { error: "duplicate-year" };

    if (input.duplicateFromSeasonId) {
      const source = await prisma.season.findUnique({
        where: { id: input.duplicateFromSeasonId, squadId },
        // isDeparted: false — duplicar uma temporada carrega o elenco
        // ATUAL adiante; um jogador que já saiu daquela temporada não
        // deve reaparecer como se ainda estivesse lá na nova.
        include: {
          players: { where: { isDeparted: false } },
          lineups: { orderBy: { order: "asc" }, include: { starters: true } },
        },
      });
      if (!source) return { error: "source-not-found" };

      const season = await prisma.season.create({
        data: {
          squadId,
          startYear: input.startYear,
          // Etapa 10.1 — nunca herdado do source implicitamente: duplicar
          // "Brasil — Copa América 2019" não deve marcar a cópia como
          // também sendo daquele torneio a menos que o usuário escolha
          // isso explicitamente na hora de duplicar.
          competitionId: input.competitionId,
          formation: source.formation,
          // Coach agora é uma entidade compartilhada (§ nova etapa) — a
          // temporada duplicada começa com o MESMO técnico (referência),
          // não uma cópia independente de texto como antes; editável
          // depois igual qualquer outra temporada.
          coachId: source.coachId,
        },
      });

      // squadPlayerId (na temporada ORIGEM) → cachedPlayerId — a "ponte"
      // estável pra remapear os titulares de cada escalação copiada
      // abaixo pro SquadPlayer NOVO do mesmo jogador (cada duplicação gera
      // ids novos; cachedPlayerId é o que não muda).
      const sourceIdToCachedPlayerId = new Map(source.players.map((p) => [p.id, p.cachedPlayerId]));
      let newIdByCachedPlayerId = new Map<string, string>();

      if (source.players.length > 0) {
        await prisma.squadPlayer.createMany({
          data: source.players.map((p) => ({
            seasonId: season.id,
            cachedPlayerId: p.cachedPlayerId,
            shirtNumber: p.shirtNumber,
            isCaptain: p.isCaptain,
            isYouth: p.isYouth,
            isStarter: p.isStarter,
            isWatchlist: p.isWatchlist,
            isExtra: p.isExtra,
            positionSlot: p.positionSlot,
            order: p.order,
          })),
        });

        const created = await prisma.squadPlayer.findMany({
          where: { seasonId: season.id },
          select: { id: true, cachedPlayerId: true },
        });
        newIdByCachedPlayerId = new Map(created.map((p) => [p.cachedPlayerId, p.id]));

        // CORREÇÃO — duplicar temporada criava os SquadPlayer diretamente
        // via createMany acima, sem passar por addPlayerToSeason/signPlayer
        // (os únicos dois lugares que chamavam ensureCareerStintForSeason
        // até agora) — por isso um jogador copiado pra temporada duplicada
        // nunca ganhava a passagem correspondente na carreira dele. Mesma
        // função, mesma idempotência (não cria uma segunda CareerStint se
        // o jogador não tiver carreira, ou se essa temporada já estiver
        // vinculada a uma).
        await Promise.all(
          source.players.map((p) => ensureCareerStintForSeason(p.cachedPlayerId, season.id)),
        );
      }

      // Etapa "escalações múltiplas" — cada escalação da temporada origem
      // vira uma escalação nova (mesmo nome/formação/ordem), com os
      // titulares remapeados pros SquadPlayer novos. Um titular cujo
      // jogador não foi copiado adiante (já tinha saído do clube — filtro
      // isDeparted acima) simplesmente não entra na escalação nova, em vez
      // de dar erro.
      for (const sourceLineup of source.lineups) {
        const newLineup = await prisma.squadLineup.create({
          data: { seasonId: season.id, name: sourceLineup.name, formation: sourceLineup.formation, order: sourceLineup.order },
        });

        const starterRows = sourceLineup.starters.flatMap((st) => {
          const cachedPlayerId = sourceIdToCachedPlayerId.get(st.squadPlayerId);
          const newSquadPlayerId = cachedPlayerId ? newIdByCachedPlayerId.get(cachedPlayerId) : undefined;
          if (!newSquadPlayerId) return [];
          return [{ lineupId: newLineup.id, squadPlayerId: newSquadPlayerId, positionSlot: st.positionSlot, xOffset: st.xOffset, yOffset: st.yOffset }];
        });
        if (starterRows.length > 0) await prisma.squadLineupStarter.createMany({ data: starterRows });
      }

      // Kits (§1.5 da etapa) — deliberadamente NÃO copiados pra temporada
      // duplicada, diferente de formation/coachId acima. O motivo é o
      // oposto do de coachId: formation/técnico tendem a se repetir de um
      // ano pro outro e valem como "base" reaproveitável, mas o uniforme é
      // exatamente o tipo de dado que MUDA a cada temporada — é a própria
      // razão da feature existir (§1.1/§1.4: Coritiba 2019 ≠ 2020 ≠ 2021).
      // Copiar arriscaria deixar o kit de 2026 mostrando o de 2025 até o
      // usuário notar e trocar manualmente; ficar em branco (mesmo
      // comportamento de qualquer temporada nova, §1.8) é o padrão seguro.
      // Mesmo tratamento de `notes` acima: específico da temporada, não
      // parte da base copiada.

      return { season: (await getSeasonById(season.id))! };
    }

    const season = await prisma.season.create({
      data: { squadId, startYear: input.startYear, competitionId: input.competitionId },
    });
    // Mesma invariante de createInitialSeason/o branch de duplicar acima
    // — toda temporada nasce com pelo menos uma escalação, nunca "zero".
    // "4-3-3" bate com o @default do próprio Season.formation.
    await prisma.squadLineup.create({
      data: { seasonId: season.id, name: "Formação 1", formation: season.formation, order: 0 },
    });
    return { season: (await getSeasonById(season.id))! };
  },

  async updateSeason(
    id: string,
    data: {
      coachId?: string | null;
      notes?: string | null;
      wins?: number;
      draws?: number;
      losses?: number;
    },
  ) {
    return prisma.season.update({ where: { id }, data });
  },

  async deleteSeason(id: string) {
    await prisma.season.delete({ where: { id } });
  },

  /**
   * Adds a title to this season, resolving the competition either by an
   * existing id or by name (creating it if new — see
   * competitionService.findOrCreateCompetition). Idempotent per
   * competition (§1: a season can't have the same title twice — the
   * SeasonTitle unique constraint would reject a plain duplicate insert,
   * so this just returns the existing row instead of erroring).
   */
  async addTitle(
    seasonId: string,
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

    const existing = await prisma.seasonTitle.findUnique({
      where: { seasonId_competitionId: { seasonId, competitionId } },
      include: { competition: true },
    });
    if (existing) return existing;

    return prisma.seasonTitle.create({
      data: { seasonId, competitionId },
      include: { competition: true },
    });
  },

  async removeTitle(seasonId: string, titleId: string) {
    await prisma.seasonTitle.delete({ where: { id: titleId, seasonId } });
  },

  /**
   * Etapa 9 parte 3 — minikits: adiciona OU substitui (upsert por
   * [seasonId, type], §1.7 "adicionar"/"substituir" são a mesma ação do
   * ponto de vista do dado). Nunca cria os outros tipos junto — cada
   * chamada afeta só o `type` passado.
   */
  async setKit(seasonId: string, type: string, imageUrl: string) {
    if (!KIT_TYPES.some((k) => k.value === type) || !imageUrl.trim()) return null;
    return prisma.seasonKit.upsert({
      where: { seasonId_type: { seasonId, type } },
      create: { seasonId, type, imageUrl: imageUrl.trim() },
      update: { imageUrl: imageUrl.trim() },
    });
  },

  /** Remove só este tipo de kit — nunca a temporada, nunca os outros kits dela (§1.7). */
  async removeKit(seasonId: string, type: string) {
    await prisma.seasonKit.deleteMany({ where: { seasonId, type } });
  },

  // ── Competições da temporada (etapa 9 parte 4, §1) ────────────────────

  async listSeasonCompetitions(seasonId: string) {
    return prisma.seasonCompetition.findMany({
      where: { seasonId },
      include: { competition: true },
      orderBy: { order: "asc" },
    });
  },

  /**
   * Declara que esta temporada disputou tal competição — resolvendo por id
   * ou por nome (criando se novo), mesmo padrão de addTitle. Idempotente:
   * a unique constraint rejeitaria um insert duplicado, então só retorna a
   * linha existente em vez de erro. NÃO cria PlayerCompetitionStats pra
   * ninguém — isso só acontece quando um valor é de fato digitado (ver
   * player-stats.service.ts), então esta lista é só "o que apareceu como
   * opção pros jogadores", nunca um gatilho de dados em massa.
   */
  async addSeasonCompetition(
    seasonId: string,
    input: { competitionId?: string; competitionName?: string },
  ) {
    let competitionId = input.competitionId;
    if (!competitionId) {
      if (!input.competitionName?.trim()) return null;
      const competition = await competitionService.findOrCreateCompetition(input.competitionName);
      competitionId = competition.id;
    }

    const existing = await prisma.seasonCompetition.findUnique({
      where: { seasonId_competitionId: { seasonId, competitionId } },
      include: { competition: true },
    });
    if (existing) return existing;

    const { _max } = await prisma.seasonCompetition.aggregate({ where: { seasonId }, _max: { order: true } });
    // Mesma proteção contra corrida do check-then-create de playerStatsService.addCompetitionStats — improvável aqui (um submit por vez), mas barato de manter consistente.
    return prisma.seasonCompetition
      .create({
        data: { seasonId, competitionId, order: (_max.order ?? -1) + 1 },
        include: { competition: true },
      })
      .catch(() =>
        prisma.seasonCompetition.findUnique({
          where: { seasonId_competitionId: { seasonId, competitionId } },
          include: { competition: true },
        }),
      );
  },

  /**
   * Tira a competição da lista da temporada — nunca apaga
   * PlayerCompetitionStats já preenchida por algum jogador pra ela (§1.2:
   * "declarar" e "ter dado" são coisas independentes; um jogador que já
   * tinha números aqui continua com eles, só some da lista de "clique pra
   * preencher" de quem ainda não tinha).
   */
  async removeSeasonCompetition(seasonId: string, seasonCompetitionId: string) {
    await prisma.seasonCompetition.delete({ where: { id: seasonCompetitionId, seasonId } });
  },

  /**
   * Legacy free-text entry — kept only so pre-etapa-7 transfers (created
   * before a transfer was linked to a real CachedPlayer) keep working.
   * `transferPlayerOut`/`signPlayer` below are the real, elenco-integrated
   * paths etapa 7 adds; nothing in the current UI calls this anymore for
   * new transfers.
   */
  async addTransfer(
    seasonId: string,
    input: { type: "in" | "out"; playerName: string; counterpartClub?: string | null; value?: number | null },
  ) {
    const { _max } = await prisma.transfer.aggregate({ where: { seasonId }, _max: { order: true } });
    return prisma.transfer.create({
      data: {
        seasonId,
        type: input.type,
        playerName: input.playerName.trim(),
        counterpartClub: input.counterpartClub?.trim() || null,
        value: input.value ?? null,
        order: (_max.order ?? -1) + 1,
      },
    });
  },

  async removeTransfer(seasonId: string, transferId: string) {
    await prisma.transfer.delete({ where: { id: transferId, seasonId } });
  },

  /**
   * §8/§9 etapa 9 complementar — até agora uma transferência só podia ser
   * excluída. Edita só os campos "de superfície" (clube contrapartida,
   * valor, tipo do negócio) — deliberadamente NÃO deixa trocar o jogador
   * nem a temporada: `cachedPlayerId`/`seasonId` são o que amarra esta
   * linha ao SquadPlayer/vínculo de carreira reais (§14 "não perder...
   * vínculo Clube ↔ Carreira"), e mudar qualquer um dos dois deixaria essa
   * amarração inconsistente sem reconstruir a passagem inteira — fora do
   * que foi pedido ("editar", não "mover pra outro jogador/temporada").
   * `playerName` também não é editável aqui pelo mesmo motivo: pra
   * qualquer transferência criada pelo fluxo atual (signPlayer/
   * transferPlayerOut) ela é só um espelho do nome do CachedPlayer.
   *
   * Espelha em CareerTransfer quando existir (mesmo vínculo 1:1 via
   * sourceTransferId que mirrorTransferOnCareer já cria) — assim editar
   * o valor/clube no Modo Clubes não deixa a Carreira com um valor antigo
   * pra sempre.
   */
  async updateTransfer(
    seasonId: string,
    transferId: string,
    patch: {
      counterpartClub?: string | null;
      value?: number | null;
      dealType?: "permanent" | "loan";
      transferWindow?: "start" | "mid" | null;
    },
  ): Promise<{ transfer: Awaited<ReturnType<typeof prisma.transfer.update>> } | { error: "not-found" | "missing-club" }> {
    const existing = await prisma.transfer.findUnique({ where: { id: transferId, seasonId } });
    if (!existing) return { error: "not-found" };

    // Uma "saída" sempre precisa de um clube de destino — mesma regra de
    // transferPlayerOut (§missing-club), só validada aqui na edição.
    // Uma "entrada" pode ficar sem clube de origem (contratação de
    // agente livre), então só "out" é obrigatório.
    const nextCounterpartClub = patch.counterpartClub !== undefined ? patch.counterpartClub?.trim() || null : undefined;
    if (existing.type === "out" && nextCounterpartClub !== undefined && !nextCounterpartClub) {
      return { error: "missing-club" };
    }

    const transfer = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        ...(nextCounterpartClub !== undefined && { counterpartClub: nextCounterpartClub }),
        ...(patch.value !== undefined && { value: patch.value }),
        ...(patch.dealType !== undefined && { dealType: patch.dealType }),
        ...(patch.transferWindow !== undefined && { transferWindow: patch.transferWindow }),
      },
    });

    await prisma.careerTransfer.updateMany({
      where: { sourceTransferId: transferId },
      data: {
        ...(patch.value !== undefined && { value: patch.value }),
        // "out" já foi validado acima como nunca vazio quando enviado —
        // o "!" aqui só documenta essa garantia pro TS (toClubName não é
        // opcional no schema, diferente de fromClubName).
        ...(nextCounterpartClub !== undefined &&
          (transfer.type === "in" ? { fromClubName: nextCounterpartClub } : { toClubName: nextCounterpartClub! })),
      },
    });

    return { transfer };
  },

  /**
   * §2-§7: a real "saída" — a player picked from the season's own roster
   * (must already be a SquadPlayer here, §33's "transferência de jogador
   * que não pertence ao elenco"), removed from it, with a Transfer("out")
   * recorded in the same action. `dealType` is orthogonal to §18's "livre":
   * a free transfer is just `value: null` on a "permanent" deal, no
   * separate type needed.
   *
   * CORREÇÃO (etapa 9 complementar, §10-14) — isto costumava fazer
   * `prisma.squadPlayer.delete(...)`, que cascateava (onDelete: Cascade)
   * e apagava também PlayerCompetitionStats: o histórico daquela
   * passagem no clube sumia pra sempre no exato momento da venda, e como
   * career.service.ts#decorateLinkedStints lê essas estatísticas AO VIVO
   * pra decorar a carreira, o total da carreira também caía
   * retroativamente. Agora só marca `isDeparted: true` (nunca mais
   * aparece no elenco ativo — getSeasonById já filtra — mas a linha e as
   * estatísticas continuam intactas pro histórico do clube/rankings e
   * pra carreira). Também limpa os campos de posicionamento (o jogador
   * não ocupa mais slot nenhum), mas preserva shirtNumber/isCaptain como
   * registro de como ele jogava antes de sair.
   */
  async transferPlayerOut(
    seasonId: string,
    squadPlayerId: string,
    input: {
      counterpartClub: string;
      value?: number | null;
      dealType?: "permanent" | "loan";
      transferWindow?: "start" | "mid";
    },
  ): Promise<{ transfer: Awaited<ReturnType<typeof prisma.transfer.create>> } | { error: "not-in-squad" | "missing-club" }> {
    const counterpartClub = input.counterpartClub?.trim();
    if (!counterpartClub) return { error: "missing-club" };

    const squadPlayer = await prisma.squadPlayer.findUnique({
      where: { id: squadPlayerId, seasonId, isDeparted: false },
      include: { cachedPlayer: true, season: { include: { squad: true } } },
    });
    if (!squadPlayer) return { error: "not-in-squad" };

    const dealType = input.dealType === "loan" ? "loan" : "permanent";
    const { _max } = await prisma.transfer.aggregate({ where: { seasonId }, _max: { order: true } });

    const transfer = await prisma.transfer.create({
      data: {
        seasonId,
        type: "out",
        playerName: squadPlayer.cachedPlayer.name,
        counterpartClub,
        value: input.value ?? null,
        dealType,
        transferWindow: input.transferWindow ?? null,
        cachedPlayerId: squadPlayer.cachedPlayerId,
        order: (_max.order ?? -1) + 1,
      },
    });

    // Soft-delete after creating the Transfer — same ordering rationale
    // as before (a failure creating the Transfer never leaves the roster
    // missing a player with nothing recorded), just no longer a real
    // delete: leaves the row (and its PlayerCompetitionStats/history)
    // intact, just out of the active roster.
    await prisma.squadPlayer.update({
      where: { id: squadPlayerId },
      data: { isDeparted: true, isStarter: false, isWatchlist: false, isExtra: false, positionSlot: null, xOffset: null, yOffset: null },
    });

    // Etapa "escalações múltiplas" — sai do time também tira o jogador de
    // QUALQUER escalação em que fosse titular (não só a que estava aberta
    // na hora), senão a linha de SquadLineupStarter ficaria "órfã": a
    // escalação continuaria achando que ele titulariza ali, mas
    // getSeasonById já não devolve mais esse jogador (filtro isDeparted:
    // false), o que faria a tela tentar desenhar um titular sem dados.
    await prisma.squadLineupStarter.deleteMany({ where: { squadPlayerId, lineup: { seasonId } } });

    await mirrorTransferOnCareer(transfer.id, squadPlayer.cachedPlayerId, {
      fromClubName: squadPlayer.season.squad.name,
      toClubName: counterpartClub,
      value: input.value ?? null,
      year: squadPlayer.season.startYear,
    });

    return { transfer };
  },

  /**
   * §8-§13: a real "entrada"/contratação — either an existing player
   * (§9 opção A, same source+externalId resolution addPlayerToSeason
   * uses) or a brand new one created in the same action (§9 opção B, same
   * "custom" CachedPlayer creation createCustomPlayer uses) — either way,
   * ending with that player added to the roster and a Transfer("in")
   * recorded together, never as two separate steps (§13).
   */
  async signPlayer(
    seasonId: string,
    input: {
      playerRef?: { source: string; externalId: string };
      newPlayer?: {
        name: string;
        position?: string;
        secondaryPositions?: string[];
        photoUrl?: string;
        dateOfBirth?: Date;
        nationality?: string;
        overall?: number;
        potential?: number;
        externalLink?: string;
      };
      shirtNumber?: number;
      counterpartClub?: string | null;
      value?: number | null;
      dealType?: "permanent" | "loan";
      transferWindow?: "start" | "mid";
    },
  ): Promise<
    | { player: Awaited<ReturnType<typeof prisma.squadPlayer.create>>; transfer: Awaited<ReturnType<typeof prisma.transfer.create>> }
    | { error: "already-in-squad" | "player-not-found" | "missing-player" }
  > {
    const season = await prisma.season.findUnique({ where: { id: seasonId }, include: { squad: true } });
    if (!season) return { error: "player-not-found" };

    let cachedPlayerId: string;
    if (input.playerRef) {
      const player = await playerDataService.getPlayer(input.playerRef.source, input.playerRef.externalId);
      const cached = player && (await cacheRepository.getPlayer(input.playerRef.source, input.playerRef.externalId));
      if (!cached) return { error: "player-not-found" };
      cachedPlayerId = cached.id;
    } else if (input.newPlayer) {
      const externalId = crypto.randomUUID();
      const cached = await cacheRepository.upsertPlayer(CUSTOM_PLAYER_SOURCE, externalId, {
        name: input.newPlayer.name,
        position: input.newPlayer.position,
        secondaryPositions: input.newPlayer.secondaryPositions ?? [],
        photoUrl: input.newPlayer.photoUrl,
        dateOfBirth: input.newPlayer.dateOfBirth,
        nationality: input.newPlayer.nationality,
        overall: input.newPlayer.overall,
        potential: input.newPlayer.potential,
        externalLink: input.newPlayer.externalLink,
        rawData: { custom: true },
        expiresAt: new Date(Date.now() + CUSTOM_PLAYER_TTL_MS),
      });
      cachedPlayerId = cached.id;
    } else {
      return { error: "missing-player" };
    }

    const existing = await prisma.squadPlayer.findUnique({
      where: { seasonId_cachedPlayerId: { seasonId, cachedPlayerId } },
    });
    // §10-14 — se ele já saiu desta temporada (isDeparted), contratá-lo
    // de novo reativa a mesma linha (mesmo raciocínio de
    // addPlayerToSeason acima) em vez de bloquear com "already-in-squad".
    if (existing && !existing.isDeparted) return { error: "already-in-squad" };

    const [{ _max: playerMax }, bucket, { _max: transferMax }] = await Promise.all([
      prisma.squadPlayer.aggregate({ where: { seasonId }, _max: { order: true } }),
      resolveDestinationBucket(seasonId, "bench"),
      prisma.transfer.aggregate({ where: { seasonId }, _max: { order: true } }),
    ]);

    const squadPlayer = existing
      ? await prisma.squadPlayer.update({
          where: { id: existing.id },
          data: { isDeparted: false, isStarter: false, ...bucket, shirtNumber: input.shirtNumber, order: (playerMax.order ?? -1) + 1 },
          include: { cachedPlayer: true },
        })
      : await prisma.squadPlayer.create({
          data: {
            seasonId,
            cachedPlayerId,
            isStarter: false,
            ...bucket,
            shirtNumber: input.shirtNumber,
            order: (playerMax.order ?? -1) + 1,
          },
          include: { cachedPlayer: true },
        });

    const dealType = input.dealType === "loan" ? "loan" : "permanent";
    const counterpartClub = input.counterpartClub?.trim() || null;
    const transfer = await prisma.transfer.create({
      data: {
        seasonId,
        type: "in",
        playerName: squadPlayer.cachedPlayer.name,
        counterpartClub,
        value: input.value ?? null,
        dealType,
        transferWindow: input.transferWindow ?? null,
        cachedPlayerId,
        order: (transferMax.order ?? -1) + 1,
      },
    });

    await mirrorTransferOnCareer(transfer.id, cachedPlayerId, {
      fromClubName: counterpartClub,
      toClubName: season.squad.name,
      value: input.value ?? null,
      year: season.startYear,
    });

    // CORREÇÃO: reflete a contratação na carreira do jogador, se ele
    // tiver uma. Chamada depois do espelho da transferência acima de
    // propósito, pra manter a ordem certa na timeline (a transferência
    // aparece antes da nova passagem, não depois).
    await ensureCareerStintForSeason(cachedPlayerId, seasonId);

    return { player: squadPlayer, transfer };
  },

  /**
   * Bulk-persists a new bench/extras/watchlist arrangement after a
   * drag-and-drop change — the fields that are GLOBAL to the season
   * (shared by every escalação), not scoped to whichever one is currently
   * being edited (that's `replaceLineupStarters` below). Always includes
   * `shirtNumber` (not just the bucket fields) because a swap that pulls
   * someone in from extras/watchlist makes them inherit the displaced
   * player's number — client computes the new value, this just needs to
   * save whatever it's given (a no-op resend of the same number for plain
   * reordering).
   */
  async updateSeasonPlayers(
    seasonId: string,
    updates: {
      id: string;
      isWatchlist: boolean;
      isExtra: boolean;
      shirtNumber: number | null;
      order: number;
    }[],
  ) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.squadPlayer.update({
          where: { id: u.id, seasonId },
          data: {
            isWatchlist: u.isWatchlist,
            isExtra: u.isExtra,
            shirtNumber: u.shirtNumber,
            order: u.order,
          },
        }),
      ),
    );
  },

  /**
   * Etapa "escalações múltiplas" — cria uma escalação nova pra temporada.
   * `duplicateFromLineupId` (opcional) copia os titulares da escalação
   * indicada como ponto de partida (mesma temporada, então os
   * squadPlayerId já batem direto, sem remapear nada) — usado pelo "+
   * Nova escalação" da UI, que parte da que está aberta no momento.
   */
  async createLineup(
    seasonId: string,
    input: { name: string; formation: string; duplicateFromLineupId?: string },
  ) {
    const { _max } = await prisma.squadLineup.aggregate({ where: { seasonId }, _max: { order: true } });
    const lineup = await prisma.squadLineup.create({
      data: { seasonId, name: input.name, formation: input.formation, order: (_max.order ?? -1) + 1 },
    });

    if (input.duplicateFromLineupId) {
      const source = await prisma.squadLineupStarter.findMany({
        where: { lineupId: input.duplicateFromLineupId, lineup: { seasonId } },
      });
      if (source.length > 0) {
        await prisma.squadLineupStarter.createMany({
          data: source.map((s) => ({
            lineupId: lineup.id,
            squadPlayerId: s.squadPlayerId,
            positionSlot: s.positionSlot,
            xOffset: s.xOffset,
            yOffset: s.yOffset,
          })),
        });
      }
    }

    return lineup;
  },

  async renameLineup(seasonId: string, lineupId: string, name: string) {
    return prisma.squadLineup.update({ where: { id: lineupId, seasonId }, data: { name: name.trim() } });
  },

  /**
   * Exclui uma escalação — nunca a última: uma temporada sempre precisa
   * ter pelo menos uma (não existe "sem escalação nenhuma"). Se a
   * excluída era a "padrão" (menor order — ver comentário no schema),
   * ressincroniza Season.formation com a nova padrão (a próxima menor
   * order que sobrou) na mesma hora, pra nenhuma tela que só exibe
   * Season.formation (card do dashboard etc.) ficar mostrando a formação
   * de uma escalação que não existe mais.
   */
  async deleteLineup(seasonId: string, lineupId: string): Promise<{ error?: "last-lineup" }> {
    const count = await prisma.squadLineup.count({ where: { seasonId } });
    if (count <= 1) return { error: "last-lineup" };

    await prisma.squadLineup.delete({ where: { id: lineupId, seasonId } });

    const newDefault = await prisma.squadLineup.findFirst({ where: { seasonId }, orderBy: { order: "asc" } });
    if (newDefault) await prisma.season.update({ where: { id: seasonId }, data: { formation: newDefault.formation } });

    return {};
  },

  /**
   * Troca a formação de UMA escalação e remapeia os titulares dela pros
   * slots da formação nova (mesma lógica greedy da criação inicial da
   * temporada), preservando quem é titular — capitão/número/banco são
   * globais e não são tocados aqui. Titulares de OUTRAS escalações da
   * mesma temporada não são afetados.
   */
  async changeLineupFormation(seasonId: string, lineupId: string, formation: string) {
    const lineup = await prisma.squadLineup.findUnique({ where: { id: lineupId, seasonId } });
    if (!lineup) return null;

    const starters = await prisma.squadLineupStarter.findMany({
      where: { lineupId },
      include: { squadPlayer: { include: { cachedPlayer: true } } },
    });
    const assignments = assignStartingXI(
      starters.map((s) => ({
        cachedPlayerId: s.squadPlayer.cachedPlayerId,
        position: s.squadPlayer.cachedPlayer.position ?? undefined,
        overall: s.squadPlayer.cachedPlayer.overall ?? undefined,
      })),
      formation,
    );
    const squadPlayerIdByCachedPlayerId = new Map(starters.map((s) => [s.squadPlayer.cachedPlayerId, s.squadPlayerId]));

    // §4 — troca de formação recalcula os slots do zero; um ajuste fino de
    // posição salvo pra formação ANTERIOR não faz sentido na nova
    // (coordenadas de slot diferentes), então não é preservado.
    const newStarters = assignments
      .filter((a) => a.isStarter && a.positionSlot)
      .map((a) => ({
        lineupId,
        squadPlayerId: squadPlayerIdByCachedPlayerId.get(a.cachedPlayerId)!,
        positionSlot: a.positionSlot!,
      }));

    await prisma.$transaction([
      prisma.squadLineup.update({ where: { id: lineupId }, data: { formation } }),
      prisma.squadLineupStarter.deleteMany({ where: { lineupId } }),
      ...(newStarters.length > 0 ? [prisma.squadLineupStarter.createMany({ data: newStarters })] : []),
    ]);

    // A escalação padrão (menor order) é a que outras telas exibem via
    // Season.formation — mantém os dois em sincronia quando é ela que
    // mudou.
    const defaultLineup = await prisma.squadLineup.findFirst({ where: { seasonId }, orderBy: { order: "asc" } });
    if (defaultLineup?.id === lineupId) {
      await prisma.season.update({ where: { id: seasonId }, data: { formation } });
    }

    return getSeasonById(seasonId);
  },

  /**
   * Bulk-persiste os titulares (quem + onde) de UMA escalação depois de
   * um drag-and-drop — substitui a lista inteira (delete-all + recria),
   * mesmo padrão "reenvia a lista completa" já usado pra reorder do
   * dashboard, evitando ter que calcular diff.
   */
  async replaceLineupStarters(
    seasonId: string,
    lineupId: string,
    starters: { squadPlayerId: string; positionSlot: string; xOffset?: number | null; yOffset?: number | null }[],
  ) {
    const lineup = await prisma.squadLineup.findUnique({ where: { id: lineupId, seasonId } });
    if (!lineup) return { error: "not-found" as const };

    await prisma.$transaction([
      prisma.squadLineupStarter.deleteMany({ where: { lineupId } }),
      ...(starters.length > 0
        ? [
            prisma.squadLineupStarter.createMany({
              data: starters.map((s) => ({
                lineupId,
                squadPlayerId: s.squadPlayerId,
                positionSlot: s.positionSlot,
                xOffset: s.xOffset ?? null,
                yOffset: s.yOffset ?? null,
              })),
            }),
          ]
        : []),
    ]);

    return {};
  },

  /** Sets shirt number and/or captain for one player. Setting isCaptain clears any previous captain in the season. */
  async updateSeasonPlayer(
    seasonId: string,
    playerId: string,
    data: { shirtNumber?: number | null; isCaptain?: boolean; isYouth?: boolean },
  ) {
    if (data.isCaptain) {
      await prisma.squadPlayer.updateMany({
        where: { seasonId, isCaptain: true },
        data: { isCaptain: false },
      });
    }
    return prisma.squadPlayer.update({ where: { id: playerId, seasonId }, data });
  },

  /**
   * Adds any player (identified by source+externalId, from a player
   * search — Kaggle catalog or a live API-Football/TheSportsDB lookup) to
   * the season's bench (or, for national-team seasons, its watchlist).
   * Idempotent: adding a player already in the season just returns their
   * existing row instead of erroring.
   */
  async addPlayerToSeason(
    seasonId: string,
    ref: { source: string; externalId: string },
    destination: "bench" | "watchlist" = "bench",
  ) {
    const player = await playerDataService.getPlayer(ref.source, ref.externalId);
    if (!player) return null;

    const cached = await cacheRepository.getPlayer(ref.source, ref.externalId);
    if (!cached) return null;

    const existing = await prisma.squadPlayer.findUnique({
      where: { seasonId_cachedPlayerId: { seasonId, cachedPlayerId: cached.id } },
      include: { cachedPlayer: true },
    });
    // §10-14 — um jogador que JÁ saiu desta temporada (isDeparted) e é
    // adicionado de novo (ex: voltou de empréstimo) reativa a MESMA linha
    // em vez de tentar criar uma segunda (a unique constraint
    // [seasonId, cachedPlayerId] nem deixaria) — reaproveita o histórico
    // já acumulado dela em vez de perder tudo e começar do zero.
    if (existing && !existing.isDeparted) return existing;

    const [{ _max }, bucket] = await Promise.all([
      prisma.squadPlayer.aggregate({ where: { seasonId }, _max: { order: true } }),
      resolveDestinationBucket(seasonId, destination),
    ]);

    const squadPlayer = existing
      ? await prisma.squadPlayer.update({
          where: { id: existing.id },
          data: { isDeparted: false, isStarter: false, ...bucket, order: (_max.order ?? -1) + 1 },
          include: { cachedPlayer: true },
        })
      : await prisma.squadPlayer.create({
          data: {
            seasonId,
            cachedPlayerId: cached.id,
            isStarter: false,
            ...bucket,
            order: (_max.order ?? -1) + 1,
          },
          include: { cachedPlayer: true },
        });

    // CORREÇÃO: reflete essa entrada no elenco na carreira do jogador,
    // se ele tiver uma — ver comentário em ensureCareerStintForSeason.
    await ensureCareerStintForSeason(cached.id, seasonId);

    return squadPlayer;
  },

  async removePlayerFromSeason(seasonId: string, playerId: string) {
    await prisma.squadPlayer.delete({ where: { id: playerId, seasonId } });
  },

  async getSeasonPlayer(seasonId: string, playerId: string) {
    return prisma.squadPlayer.findUnique({
      where: { id: playerId, seasonId },
      include: { cachedPlayer: true },
    });
  },

  /**
   * Creates a player that exists only in this app (not backed by any
   * provider) — for when a search across Kaggle/API-Football/TheSportsDB
   * still doesn't find who the user wants. Added straight to the bench
   * (or, for national-team seasons, the watchlist); `expiresAt` is set far
   * in the future since there's no source to ever refresh it from.
   */
  async createCustomPlayer(
    seasonId: string,
    input: {
      name: string;
      position?: string;
      secondaryPositions?: string[];
      photoUrl?: string;
      dateOfBirth?: Date;
      nationality?: string;
      overall?: number;
      potential?: number;
      externalLink?: string;
      shirtNumber?: number;
      destination?: "bench" | "watchlist";
    },
  ) {
    const externalId = crypto.randomUUID();
    const cached = await cacheRepository.upsertPlayer(CUSTOM_PLAYER_SOURCE, externalId, {
      name: input.name,
      position: input.position,
      secondaryPositions: input.secondaryPositions ?? [],
      photoUrl: input.photoUrl,
      dateOfBirth: input.dateOfBirth,
      nationality: input.nationality,
      overall: input.overall,
      potential: input.potential,
      externalLink: input.externalLink,
      rawData: { custom: true },
      expiresAt: new Date(Date.now() + CUSTOM_PLAYER_TTL_MS),
    });

    const [{ _max }, bucket] = await Promise.all([
      prisma.squadPlayer.aggregate({ where: { seasonId }, _max: { order: true } }),
      resolveDestinationBucket(seasonId, input.destination ?? "bench"),
    ]);

    return prisma.squadPlayer.create({
      data: {
        seasonId,
        cachedPlayerId: cached.id,
        isStarter: false,
        ...bucket,
        shirtNumber: input.shirtNumber,
        order: (_max.order ?? -1) + 1,
      },
      include: { cachedPlayer: true },
    });
  },
};

const CUSTOM_PLAYER_SOURCE = "custom";
const CUSTOM_PLAYER_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000;
