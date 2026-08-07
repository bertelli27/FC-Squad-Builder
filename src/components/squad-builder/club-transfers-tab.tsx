import Link from "next/link";
import { ArrowRightLeftIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { formatSeasonLabel, formatMoney } from "@/lib/season";

export interface ClubTransferData {
  id: string;
  type: string; // "in" | "out"
  playerName: string;
  counterpartClub: string | null;
  value: number | null;
  cachedPlayer: { id: string; name: string; photoUrl: string | null } | null;
  season: { startYear: number };
}

/** Etapa 10.2 — aba "Transferências": ledger cronológico completo do clube, distinto do "maiores compras/vendas" de HistoryCard. */
export function ClubTransfersTab({ transfers, seasonCalendar }: { transfers: ClubTransferData[]; seasonCalendar: string }) {
  if (transfers.length === 0) {
    return <EmptyState icon={ArrowRightLeftIcon} label="Nenhuma transferência registrada ainda." />;
  }

  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {transfers.map((t) => (
        <li key={t.id} className="flex items-center gap-3 p-3 text-sm">
          {t.cachedPlayer ? (
            <PlayerAvatar src={t.cachedPlayer.photoUrl} name={t.cachedPlayer.name} size="sm" />
          ) : (
            <PlayerAvatar src={null} name={t.playerName} size="sm" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {t.cachedPlayer ? (
                <Link href={`/players/${t.cachedPlayer.id}`} className="hover:underline">
                  {t.playerName}
                </Link>
              ) : (
                t.playerName
              )}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {t.type === "in" ? "Contratação" : "Saída"}
              {t.counterpartClub && ` · ${t.type === "in" ? t.counterpartClub + " → aqui" : "aqui → " + t.counterpartClub}`}
              {" · "}
              {formatSeasonLabel(t.season.startYear, seasonCalendar)}
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium">{t.value != null ? formatMoney(t.value) : "—"}</span>
        </li>
      ))}
    </ul>
  );
}
