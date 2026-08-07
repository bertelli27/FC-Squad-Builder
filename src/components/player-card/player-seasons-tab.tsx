import Link from "next/link";
import { CalendarIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { Badge } from "@/components/ui/badge";
import { formatSeasonLabel } from "@/lib/season";

export interface PlayerSeasonData {
  id: string; // SquadPlayer.id
  shirtNumber: number | null;
  season: {
    id: string;
    startYear: number;
    competition: { name: string } | null;
    squad: { id: string; name: string; logoUrl: string | null; seasonCalendar: string };
  };
}

/** Etapa 10.2 — aba "Temporadas": todo SquadPlayer do jogador, em qualquer clube/seleção. */
export function PlayerSeasonsTab({ seasons }: { seasons: PlayerSeasonData[] }) {
  if (seasons.length === 0) {
    return <EmptyState icon={CalendarIcon} label="Nenhuma temporada registrada ainda." />;
  }

  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {seasons.map((sp) => (
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
            {sp.shirtNumber != null && <Badge variant="outline">#{sp.shirtNumber}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
