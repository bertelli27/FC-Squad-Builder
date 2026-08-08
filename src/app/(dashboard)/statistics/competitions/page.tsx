import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, TrophyIcon } from "lucide-react";
import { statisticsService } from "@/services/statistics.service";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

/** Etapa 10.5 (§9) — competições ordenadas por títulos registrados; cada linha abre o perfil já existente da competição (sem reconstruir o drill-down que já existe lá). */
export default async function CompetitionStatisticsPage() {
  const competitions = await statisticsService.getCompetitionsByTitleCount();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/statistics" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ChevronLeft className="size-4" />
        Centro de Estatísticas
      </Link>

      <h1 className="font-heading text-2xl font-semibold tracking-tight">Competições</h1>

      {competitions.length === 0 ? (
        <EmptyState icon={TrophyIcon} label="Nenhum título registrado ainda." />
      ) : (
        <ul className="divide-border flex flex-col divide-y rounded-lg border">
          {competitions.map(({ competition, count }, i) => (
            <li key={competition.id}>
              <Link href={`/management/competitions/${competition.id}`} className="hover:bg-accent/30 flex items-center gap-3 p-3">
                <span className="text-muted-foreground w-6 shrink-0 text-right text-sm">{i + 1}.</span>
                {competition.logoUrl ? (
                  <Image src={competition.logoUrl} alt="" width={28} height={28} className="size-7 object-contain" unoptimized />
                ) : (
                  <TrophyIcon className="text-muted-foreground size-7" strokeWidth={1.25} />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{competition.name}</span>
                <span className="text-muted-foreground shrink-0 text-sm">
                  {count} {count === 1 ? "título" : "títulos"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
