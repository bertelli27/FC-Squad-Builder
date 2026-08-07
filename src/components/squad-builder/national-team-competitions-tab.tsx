import Link from "next/link";
import Image from "next/image";
import { TrophyIcon, UsersRoundIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatSeasonLabel } from "@/lib/season";

export interface ConvocationNodeData {
  competition: { id: string; name: string; logoUrl: string | null };
  convocations: {
    id: string;
    startYear: number;
    formation: string;
    coach: { name: string } | null;
    _count: { players: number };
  }[];
}

/**
 * Etapa 10.2 — aba "Competições" (seleção): árvore Seleção→Competição→
 * Convocação. Cada convocação já linka pra /squads/[id]/seasons/[seasonId]
 * existente (nenhuma tela nova precisa ser criada pra abrir uma convocação).
 */
export function NationalTeamCompetitionsTab({
  squadId,
  tree,
  seasonCalendar,
}: {
  squadId: string;
  tree: ConvocationNodeData[];
  seasonCalendar: string;
}) {
  if (tree.length === 0) {
    return <EmptyState icon={TrophyIcon} label="Nenhuma convocação vinculada a uma competição ainda." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {tree.map(({ competition, convocations }) => (
        <div key={competition.id} className="rounded-lg border p-4">
          <Link
            href={`/management/competitions/${competition.id}`}
            className="hover:underline flex items-center gap-2 font-heading text-sm font-semibold"
          >
            {competition.logoUrl ? (
              <Image src={competition.logoUrl} alt="" width={22} height={22} className="size-5.5 object-contain" unoptimized />
            ) : (
              <TrophyIcon className="text-muted-foreground size-5" strokeWidth={1.25} />
            )}
            {competition.name}
          </Link>

          <ul className="mt-3 flex flex-col gap-2">
            {convocations.map((season) => (
              <li key={season.id}>
                <Link
                  href={`/squads/${squadId}/seasons/${season.id}`}
                  className="hover:bg-accent/30 flex items-center gap-3 rounded-md border p-2 text-sm"
                >
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                    {formatSeasonLabel(season.startYear, seasonCalendar)}
                  </Badge>
                  <span className="text-muted-foreground flex items-center gap-1 text-xs">
                    <UsersRoundIcon className="size-3.5" />
                    {season._count.players}
                  </span>
                  {season.coach && <span className="text-muted-foreground truncate text-xs">{season.coach.name}</span>}
                  <span className="text-muted-foreground ml-auto shrink-0 text-xs">{season.formation}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
