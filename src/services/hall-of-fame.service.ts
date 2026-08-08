import { prisma } from "@/lib/prisma";
import { statisticsService } from "./statistics.service";
import { sortPlayerAggregates } from "@/lib/statistics";

export interface HallOfFameEntryInput {
  cachedPlayerId?: string | null;
  coachId?: string | null;
  squadId?: string | null;
  title: string;
  description?: string | null;
  year: number;
  imageUrl?: string | null;
}

export interface HallOfFameCandidateRow {
  cachedPlayer: { id: string; name: string; photoUrl: string | null };
  categories: string[];
}

const ENTRY_INCLUDE = {
  cachedPlayer: { select: { id: true, name: true, photoUrl: true } },
  coach: { select: { id: true, name: true, photoUrl: true } },
  squad: { select: { id: true, name: true, logoUrl: true } },
} as const;

/**
 * Etapa 10.6 — Hall da Fama. Guarda SÓ o reconhecimento em si
 * (`HallOfFameEntry`) — toda estatística exibida junto de uma entrada
 * continua vindo ao vivo de `statisticsService`, nunca copiada aqui.
 * Candidatos (`getCandidates`) são calculados a cada chamada, nunca
 * persistidos — não existe `HallOfFameCandidate`.
 */
export const hallOfFameService = {
  async listEntries(filters: { cachedPlayerId?: string; coachId?: string; squadId?: string } = {}) {
    return prisma.hallOfFameEntry.findMany({
      where: {
        ...(filters.cachedPlayerId && { cachedPlayerId: filters.cachedPlayerId }),
        ...(filters.coachId && { coachId: filters.coachId }),
        ...(filters.squadId && { squadId: filters.squadId }),
      },
      include: ENTRY_INCLUDE,
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });
  },

  async getEntry(id: string) {
    return prisma.hallOfFameEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE });
  },

  async listByPlayer(cachedPlayerId: string) {
    return this.listEntries({ cachedPlayerId });
  },
  async listByCoach(coachId: string) {
    return this.listEntries({ coachId });
  },
  async listBySquad(squadId: string) {
    return this.listEntries({ squadId });
  },
  async countBySquad(squadId: string) {
    return prisma.hallOfFameEntry.count({ where: { squadId } });
  },

  async createEntry(input: HallOfFameEntryInput) {
    return prisma.hallOfFameEntry.create({
      data: {
        cachedPlayerId: input.cachedPlayerId || null,
        coachId: input.coachId || null,
        squadId: input.squadId || null,
        title: input.title.trim(),
        description: input.description || null,
        year: input.year,
        imageUrl: input.imageUrl || null,
      },
      include: ENTRY_INCLUDE,
    });
  },

  /**
   * `cachedPlayerId`/`coachId` (quem é o homenageado) não são editáveis
   * depois de criado — trocar o "dono" de um reconhecimento já feito não
   * faz sentido; a UI oferece excluir e criar outro nesse caso. Contexto
   * (squadId)/título/ano/descrição/imagem continuam livremente editáveis.
   */
  async updateEntry(id: string, patch: Partial<Omit<HallOfFameEntryInput, "cachedPlayerId" | "coachId">>) {
    return prisma.hallOfFameEntry
      .update({
        where: { id },
        data: {
          ...(patch.title !== undefined && { title: patch.title.trim() }),
          ...(patch.description !== undefined && { description: patch.description }),
          ...(patch.year !== undefined && { year: patch.year }),
          ...(patch.imageUrl !== undefined && { imageUrl: patch.imageUrl }),
          ...(patch.squadId !== undefined && { squadId: patch.squadId }),
        },
        include: ENTRY_INCLUDE,
      })
      .catch(() => null);
  },

  async deleteEntry(id: string) {
    return prisma.hallOfFameEntry
      .delete({ where: { id } })
      .then(() => true)
      .catch(() => false);
  },

  /**
   * Critério de candidato (§19), calibrado contra dado real antes de fixar
   * (auditoria: produção tem só 2 jogadores com PlayerCompetitionStats hoje
   * — um corte fixo "Top 10" seria trivial/absurdo nessa escala, os 2
   * "ganhariam" tudo por não terem concorrência nenhuma). Por isso uma
   * categoria só CONTA se o pool ranqueado dela tiver pelo menos
   * `MIN_POOL` jogadores distintos — "Top 10" só é um sinal real quando
   * existem pelo menos 10 pra escolher. Candidato = aparece entre os
   * Top 10 em ao menos 2 categorias que atingem esse piso, excluindo quem
   * já é membro oficial em qualquer contexto. Hoje (pool pequeno) isso
   * retorna uma lista vazia — comportamento correto, não um bug: a lista
   * cresce sozinha conforme mais estatística real é cadastrada.
   */
  async getCandidates(filters: { kind?: "club" | "nationalTeam" } = {}): Promise<HallOfFameCandidateRow[]> {
    const MIN_POOL = 10;
    const TOP_N = 10;

    const [aggregates, titleCounts, officialEntries] = await Promise.all([
      statisticsService.getPlayerAggregates({ kind: filters.kind }),
      statisticsService.getPlayerTitleCounts({ kind: filters.kind }),
      prisma.hallOfFameEntry.findMany({ where: { cachedPlayerId: { not: null } }, select: { cachedPlayerId: true } }),
    ]);

    const categories: { label: string; ranked: { id: string; name: string; photoUrl: string | null }[] }[] = [
      { label: "artilheiros", ranked: sortPlayerAggregates(aggregates, "goals").map((r) => r.cachedPlayer) },
      { label: "assistências", ranked: sortPlayerAggregates(aggregates, "assists").map((r) => r.cachedPlayer) },
      { label: "jogos", ranked: sortPlayerAggregates(aggregates, "appearances").map((r) => r.cachedPlayer) },
      { label: "participações em gols", ranked: sortPlayerAggregates(aggregates, "contributions").map((r) => r.cachedPlayer) },
      { label: "títulos", ranked: titleCounts.map((r) => r.cachedPlayer) },
    ];

    const officialPlayerIds = new Set(officialEntries.map((e) => e.cachedPlayerId!));
    const byPlayer = new Map<string, HallOfFameCandidateRow>();

    for (const category of categories) {
      if (category.ranked.length < MIN_POOL) continue;
      for (const player of category.ranked.slice(0, TOP_N)) {
        if (officialPlayerIds.has(player.id)) continue;
        const entry = byPlayer.get(player.id) ?? { cachedPlayer: player, categories: [] };
        entry.categories.push(category.label);
        byPlayer.set(player.id, entry);
      }
    }

    return [...byPlayer.values()]
      .filter((e) => e.categories.length >= 2)
      .sort((a, b) => b.categories.length - a.categories.length || a.cachedPlayer.name.localeCompare(b.cachedPlayer.name));
  },
};
