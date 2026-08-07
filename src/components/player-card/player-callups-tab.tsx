import Link from "next/link";
import { FlagIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { formatSeasonLabel } from "@/lib/season";
import type { PlayerSeasonData } from "./player-seasons-tab";

/** Etapa 10.2 — aba "Seleções": convocações do jogador (SquadPlayer em Squad com baseKind nationalTeam). */
export function PlayerCallupsTab({ callups }: { callups: PlayerSeasonData[] }) {
  if (callups.length === 0) {
    return <EmptyState icon={FlagIcon} label="Nenhuma convocação registrada ainda." />;
  }

  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {callups.map((sp) => (
        <li key={sp.id}>
          <Link
            href={`/squads/${sp.season.squad.id}/seasons/${sp.season.id}`}
            className="hover:bg-accent/30 flex items-center gap-3 p-3"
          >
            <ClubBadge src={sp.season.squad.logoUrl} name={sp.season.squad.name} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{sp.season.squad.name}</div>
              <div className="text-muted-foreground truncate text-xs">
                {formatSeasonLabel(sp.season.startYear, sp.season.squad.seasonCalendar)}
                {sp.season.competition && ` — ${sp.season.competition.name}`}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
