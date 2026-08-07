import Link from "next/link";
import { ArrowRightLeftIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { formatSeasonLabel, formatMoney } from "@/lib/season";

export interface PlayerTransferData {
  id: string;
  type: string; // "in" | "out"
  counterpartClub: string | null;
  value: number | null;
  season: { startYear: number; squad: { id: string; name: string; logoUrl: string | null; seasonCalendar: string } };
}

/** Etapa 10.2 — aba "Transferências": Transfer.cachedPlayerId do jogador, em qualquer clube. */
export function PlayerTransfersTab({ transfers }: { transfers: PlayerTransferData[] }) {
  if (transfers.length === 0) {
    return <EmptyState icon={ArrowRightLeftIcon} label="Nenhuma transferência registrada ainda." />;
  }

  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {transfers.map((t) => (
        <li key={t.id} className="flex items-center gap-3 p-3 text-sm">
          <Link href={`/squads/${t.season.squad.id}`} className="shrink-0">
            <ClubBadge src={t.season.squad.logoUrl} name={t.season.squad.name} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              <Link href={`/squads/${t.season.squad.id}`} className="hover:underline">
                {t.season.squad.name}
              </Link>
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {t.type === "in" ? "Contratação" : "Saída"}
              {t.counterpartClub && ` · ${t.type === "in" ? t.counterpartClub + " → " + t.season.squad.name : t.season.squad.name + " → " + t.counterpartClub}`}
              {" · "}
              {formatSeasonLabel(t.season.startYear, t.season.squad.seasonCalendar)}
            </div>
          </div>
          <span className="shrink-0 text-xs font-medium">{t.value != null ? formatMoney(t.value) : "—"}</span>
        </li>
      ))}
    </ul>
  );
}
