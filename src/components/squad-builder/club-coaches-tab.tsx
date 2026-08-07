import Link from "next/link";
import { UserRoundIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/player-card/player-avatar";

export interface CoachUsedData {
  coach: { id: string; name: string; photoUrl: string | null; externalLink: string | null };
  years: number[];
}

/** Etapa 10.2 — aba "Técnicos": todo técnico que já passou pelo clube (via Season.coachId), cada um linkando pro próprio perfil. */
export function ClubCoachesTab({ coaches }: { coaches: CoachUsedData[] }) {
  if (coaches.length === 0) {
    return <EmptyState icon={UserRoundIcon} label="Nenhum técnico registrado ainda." />;
  }

  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {coaches.map(({ coach, years }) => (
        <li key={coach.id}>
          <Link href={`/coaches/${coach.id}`} className="hover:bg-accent/30 flex items-center gap-3 p-3">
            <PlayerAvatar src={coach.photoUrl} name={coach.name} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{coach.name}</div>
              <div className="text-muted-foreground truncate text-xs">
                {years.length === 1 ? years[0] : `${years[years.length - 1]}–${years[0]}`}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
