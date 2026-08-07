import Link from "next/link";
import Image from "next/image";
import { TrophyIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export interface CompetitionPlayedData {
  competition: { id: string; name: string; logoUrl: string | null };
  years: number[];
}

/** Etapa 10.2 — aba "Competições" (clube): competições distintas já disputadas, via SeasonCompetition. */
export function ClubCompetitionsTab({ competitions }: { competitions: CompetitionPlayedData[] }) {
  if (competitions.length === 0) {
    return <EmptyState icon={TrophyIcon} label="Nenhuma competição registrada ainda." />;
  }

  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {competitions.map(({ competition, years }) => (
        <li key={competition.id}>
          <Link href={`/management/competitions/${competition.id}`} className="hover:bg-accent/30 flex items-center gap-3 p-3">
            {competition.logoUrl ? (
              <Image src={competition.logoUrl} alt="" width={28} height={28} className="size-7 object-contain" unoptimized />
            ) : (
              <TrophyIcon className="text-muted-foreground size-7" strokeWidth={1.25} />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{competition.name}</div>
              <div className="text-muted-foreground truncate text-xs">
                {years.length} {years.length === 1 ? "temporada" : "temporadas"} ({years[years.length - 1]}–{years[0]})
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
