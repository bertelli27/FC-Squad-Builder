import Link from "next/link";
import { ChevronLeft, SparklesIcon, BookOpenIcon } from "lucide-react";
import { museumService } from "@/services/museum.service";
import { squadService } from "@/services/squad.service";
import { competitionService } from "@/services/competition.service";
import { MuseumSection } from "@/components/museum/museum-section";
import { MuseumRecordCard } from "@/components/museum/museum-record-card";
import { MuseumMomentCard } from "@/components/museum/museum-moment-card";
import { RankingFilters } from "@/components/statistics/ranking-filters";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ kind?: string; squadId?: string; competitionId?: string; fromYear?: string; toYear?: string }>;

/**
 * Etapa 10.6 (§11) — Recordes: automáticos (filtráveis — mudar o filtro
 * muda QUEM é o recorde, não só a exibição, mesmo padrão de
 * `statisticsService`) e históricos (`TimelineEvent` tipo "record", sempre
 * a lista completa — já é curada à mão, um filtro extra não ajudaria).
 */
export default async function MuseumRecordsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const kind = sp.kind === "club" || sp.kind === "nationalTeam" ? sp.kind : undefined;

  const [records, historicalRecords, squads, competitions] = await Promise.all([
    museumService.getAutomaticRecords({
      kind,
      squadId: sp.squadId,
      competitionId: sp.competitionId,
      fromYear: sp.fromYear ? Number(sp.fromYear) : undefined,
      toYear: sp.toYear ? Number(sp.toYear) : undefined,
    }),
    museumService.getHistoricalRecords(),
    squadService.searchSquads(),
    competitionService.listCompetitions(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/museum" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ChevronLeft className="size-4" />
        Museu
      </Link>

      <h1 className="font-heading text-2xl font-semibold tracking-tight">Recordes</h1>

      <MuseumSection icon={<SparklesIcon className="text-primary size-5" />} title="Recordes Automáticos">
        <RankingFilters
          config={{
            kind: true,
            squads: squads.map((s) => ({ id: s.id, name: s.name })),
            competitions: competitions.map((c) => ({ id: c.id, name: c.name })),
            yearRange: true,
          }}
        />
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {records.map((record) => (
            <MuseumRecordCard key={record.key} record={record} />
          ))}
        </div>
      </MuseumSection>

      <MuseumSection icon={<BookOpenIcon className="text-primary size-5" />} title="Recordes Históricos">
        {historicalRecords.length === 0 ? (
          <EmptyState
            icon={BookOpenIcon}
            label='Nenhum recorde histórico registrado ainda — registre um evento tipo "Recorde" na Timeline de um clube, jogador ou competição.'
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {historicalRecords.map((moment) => (
              <MuseumMomentCard key={moment.id} moment={moment} />
            ))}
          </div>
        )}
      </MuseumSection>
    </div>
  );
}
