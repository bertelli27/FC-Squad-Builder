import Link from "next/link";
import { Trophy, Footprints, Users, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { formatSeasonLabel, formatMoney } from "@/lib/season";

interface PlayerRankEntry {
  cachedPlayer: { name: string; photoUrl: string | null };
  appearances: number;
  goals: number;
  assists: number;
}

interface TransferRankEntry {
  id: string;
  playerName: string;
  counterpartClub: string | null;
  value: number | null;
  season: { startYear: number };
}

/**
 * §7/§8 etapa 3, §8 etapa 9-4: histórico acumulado do clube — sempre
 * derivado de PlayerCompetitionStats/Transfer de todas as temporadas
 * (squadService.getHistoricalStats/getTopTransfers), nunca digitado à
 * parte. Só aparece na visão geral do clube; uma temporada específica
 * mostra os dados dela sozinha (§9). Mostra só o TOP 3 de cada ranking
 * (§8.1) — a página completa (§8.2/§8.3) fica em /squads/[id]/history,
 * consultando os MESMOS dados sem limite (§8.4: nada é apagado, só a
 * visualização aqui é cortada).
 */
export function HistoryCard({
  squadId,
  topScorers,
  topAssists,
  mostAppearances,
  topBuys,
  topSales,
  seasonCalendar,
}: {
  squadId: string;
  topScorers: PlayerRankEntry[];
  topAssists: PlayerRankEntry[];
  mostAppearances: PlayerRankEntry[];
  topBuys: TransferRankEntry[];
  topSales: TransferRankEntry[];
  seasonCalendar: string;
}) {
  const hasAnything =
    topScorers.length > 0 ||
    topAssists.length > 0 ||
    mostAppearances.length > 0 ||
    topBuys.length > 0 ||
    topSales.length > 0;
  if (!hasAnything) return null;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="text-primary size-4" />
          Histórico do clube
        </CardTitle>
        <Link
          href={`/squads/${squadId}/history`}
          className="text-primary flex items-center gap-0.5 text-sm underline-offset-2 hover:underline"
        >
          Ver completo
          <ChevronRight className="size-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlayerRankList
          title="Artilheiros"
          icon={<Footprints className="size-3.5" />}
          entries={topScorers}
          statKey="goals"
          statLabel="gols"
        />
        <PlayerRankList
          title="Maiores assistentes"
          icon={<Users className="size-3.5" />}
          entries={topAssists}
          statKey="assists"
          statLabel="assist."
        />
        <PlayerRankList
          title="Mais jogos"
          icon={<Users className="size-3.5" />}
          entries={mostAppearances}
          statKey="appearances"
          statLabel="jogos"
        />
        <TransferRankList
          title="Maiores compras"
          icon={<TrendingDown className="size-3.5 text-rose-600 dark:text-rose-400" />}
          entries={topBuys}
          seasonCalendar={seasonCalendar}
        />
        <TransferRankList
          title="Maiores vendas"
          icon={<TrendingUp className="size-3.5 text-emerald-600 dark:text-emerald-400" />}
          entries={topSales}
          seasonCalendar={seasonCalendar}
        />
      </CardContent>
    </Card>
  );
}

function PlayerRankList({
  title,
  icon,
  entries,
  statKey,
  statLabel,
}: {
  title: string;
  icon: React.ReactNode;
  entries: PlayerRankEntry[];
  statKey: "goals" | "assists" | "appearances";
  statLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        {icon}
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-xs">Sem dados ainda.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {entries.map((entry, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-4 shrink-0 text-right text-xs">{i + 1}.</span>
              <PlayerAvatar src={entry.cachedPlayer.photoUrl} name={entry.cachedPlayer.name} size="sm" />
              <span className="min-w-0 flex-1 truncate">{entry.cachedPlayer.name}</span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {entry[statKey]} {statLabel}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TransferRankList({
  title,
  icon,
  entries,
  seasonCalendar,
}: {
  title: string;
  icon: React.ReactNode;
  entries: TransferRankEntry[];
  seasonCalendar: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
        {icon}
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-xs">Sem dados ainda.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {entries.map((entry, i) => (
            <li key={entry.id} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-4 shrink-0 text-right text-xs">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <div className="truncate">{entry.playerName}</div>
                <div className="text-muted-foreground truncate text-xs">
                  {entry.counterpartClub && `${entry.counterpartClub} · `}
                  {formatSeasonLabel(entry.season.startYear, seasonCalendar)}
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium">
                {entry.value != null ? formatMoney(entry.value) : "—"}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
