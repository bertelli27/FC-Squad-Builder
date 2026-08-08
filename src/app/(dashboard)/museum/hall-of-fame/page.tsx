import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { hallOfFameService } from "@/services/hall-of-fame.service";
import { statisticsService } from "@/services/statistics.service";
import { squadService } from "@/services/squad.service";
import { HallOfFameView } from "@/components/museum/hall-of-fame-view";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ squadId?: string }>;

/**
 * Etapa 10.6 (§17/§18/§19) — Hall da Fama: Lendas (membros oficiais) +
 * Candidatos (calculados) + gerenciamento, tudo na mesma tela (§17 pede
 * uma subárea, não uma pilha de páginas separadas pra CRUD de algo tão
 * pequeno). Estatísticas exibidas nos cards vêm ao vivo de
 * `statisticsService` — busca UMA vez aqui (nunca uma por card, §27).
 * `?squadId=` (link vindo do perfil do clube/seleção) filtra só as
 * Lendas — Candidatos continuam globais, já que candidatura é sobre
 * destaque estatístico geral, não sobre um contexto específico.
 */
export default async function HallOfFamePage({ searchParams }: { searchParams: SearchParams }) {
  const { squadId } = await searchParams;

  const [entries, candidates, aggregates, squad] = await Promise.all([
    hallOfFameService.listEntries({ squadId }),
    hallOfFameService.getCandidates(),
    statisticsService.getPlayerAggregates(),
    squadId ? squadService.getSquad(squadId) : Promise.resolve(null),
  ]);

  const playerStats: Record<string, { label: string; value: string | number }[]> = {};
  for (const row of aggregates) {
    playerStats[row.cachedPlayer.id] = [
      { label: "jogos", value: row.appearances },
      { label: "gols", value: row.goals },
      { label: "assistências", value: row.assists },
    ];
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/museum" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ChevronLeft className="size-4" />
        Museu
      </Link>

      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Hall da Fama</h1>
        {squad && (
          <Link href="/museum/hall-of-fame" className="text-primary text-sm hover:underline">
            Filtrando por {squad.name} · limpar
          </Link>
        )}
      </div>

      <HallOfFameView initialEntries={entries} candidates={candidates} playerStats={playerStats} />
    </div>
  );
}
