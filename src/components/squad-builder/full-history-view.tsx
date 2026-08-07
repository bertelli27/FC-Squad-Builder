import Link from "next/link";
import { Footprints, Users, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { formatSeasonLabel, formatMoney } from "@/lib/season";

interface PlayerRankEntry {
  cachedPlayer: { id: string; name: string; photoUrl: string | null };
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
 * Etapa 9 parte 4 (§8.2/§8.3) — página completa dos rankings do clube:
 * mesmos dados de HistoryCard (squadService.getHistoricalStats/
 * getTopTransfers), só sem o corte de Top 3 (chamados com `limit`
 * indefinido pela página) — nenhum dado a mais existe aqui que já não
 * existisse antes, só a listagem deixa de ser truncada.
 */
export function FullHistoryView({
  topScorers,
  topAssists,
  mostAppearances,
  topBuys,
  topSales,
  seasonCalendar,
}: {
  topScorers: PlayerRankEntry[];
  topAssists: PlayerRankEntry[];
  mostAppearances: PlayerRankEntry[];
  topBuys: TransferRankEntry[];
  topSales: TransferRankEntry[];
  seasonCalendar: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <PlayerRankSection title="Artilheiros" icon={<Footprints className="size-4" />} entries={topScorers} statKey="goals" statLabel="gols" />
      <PlayerRankSection
        title="Maiores assistentes"
        icon={<Users className="size-4" />}
        entries={topAssists}
        statKey="assists"
        statLabel="assist."
      />
      <PlayerRankSection
        title="Mais jogos"
        icon={<Users className="size-4" />}
        entries={mostAppearances}
        statKey="appearances"
        statLabel="jogos"
      />
      <TransferRankSection
        title="Maiores compras"
        icon={<TrendingDown className="size-4 text-rose-600 dark:text-rose-400" />}
        entries={topBuys}
        seasonCalendar={seasonCalendar}
      />
      <TransferRankSection
        title="Maiores vendas"
        icon={<TrendingUp className="size-4 text-emerald-600 dark:text-emerald-400" />}
        entries={topSales}
        seasonCalendar={seasonCalendar}
      />
    </div>
  );
}

function PlayerRankSection({
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
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title} ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3">
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem dados ainda.</p>
        ) : (
          <ol className="divide-border flex flex-col divide-y">
            {entries.map((entry, i) => (
              <li key={i}>
                <Link href={`/players/${entry.cachedPlayer.id}`} className="hover:bg-accent/30 flex items-center gap-3 py-2">
                  <span className="text-muted-foreground w-6 shrink-0 text-right text-sm">{i + 1}.</span>
                  <PlayerAvatar src={entry.cachedPlayer.photoUrl} name={entry.cachedPlayer.name} size="default" />
                  <span className="min-w-0 flex-1 truncate text-sm">{entry.cachedPlayer.name}</span>
                  <span className="text-muted-foreground shrink-0 text-sm font-medium">
                    {entry[statKey]} {statLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function TransferRankSection({
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
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title} ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3">
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem dados ainda.</p>
        ) : (
          <ol className="divide-border flex flex-col divide-y">
            {entries.map((entry, i) => (
              <li key={entry.id} className="flex items-center gap-3 py-2">
                <span className="text-muted-foreground w-6 shrink-0 text-right text-sm">{i + 1}.</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{entry.playerName}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {entry.counterpartClub && `${entry.counterpartClub} · `}
                    {formatSeasonLabel(entry.season.startYear, seasonCalendar)}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-medium">
                  {entry.value != null ? formatMoney(entry.value) : "—"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
