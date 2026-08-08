import { LandmarkIcon, SparklesIcon, StarIcon, TrophyIcon, ArrowRightLeftIcon } from "lucide-react";
import { museumService } from "@/services/museum.service";
import { hallOfFameService } from "@/services/hall-of-fame.service";
import { MuseumHero } from "@/components/museum/museum-hero";
import { MuseumSection } from "@/components/museum/museum-section";
import { MuseumRecordCard } from "@/components/museum/museum-record-card";
import { MuseumMomentCard } from "@/components/museum/museum-moment-card";
import { HallOfFameCard } from "@/components/museum/hall-of-fame-card";
import { RankingCard } from "@/components/statistics/ranking-card";
import { DashboardCard } from "@/components/ui/dashboard-card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/season";

export const dynamic = "force-dynamic";

/** Etapa 10.6 (§11) — hub do Museu: recordes automáticos, grandes momentos, maiores transferências/títulos (prévia, linkando pro Centro de Estatísticas — ver decisão de consolidação do plano) e Hall da Fama. */
export default async function MuseumPage() {
  const [overview, legends] = await Promise.all([museumService.getOverview(), hallOfFameService.listEntries()]);

  return (
    <div className="flex flex-col gap-8">
      <MuseumHero />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          href="/museum/records"
          icon={<SparklesIcon className="text-primary size-5" />}
          title="Recordes"
          description="Automáticos (ao vivo, do Centro de Estatísticas) e históricos (registrados à mão na Timeline)"
          count="ver todos"
          actionLabel="Ver recordes"
        />
        <DashboardCard
          href="/museum/moments"
          icon={<LandmarkIcon className="text-primary size-5" />}
          title="Grandes Momentos"
          description="Marcos históricos de clubes, seleções, jogadores e competições"
          count="ver todos"
          actionLabel="Ver momentos"
        />
        <DashboardCard
          href="/museum/hall-of-fame"
          icon={<StarIcon className="text-primary size-5" />}
          title="Hall da Fama"
          description="Membros oficiais e candidatos calculados a partir dos rankings"
          count="ver todos"
          actionLabel="Ver Hall da Fama"
        />
      </div>

      <MuseumSection icon={<SparklesIcon className="text-primary size-5" />} title="Destaques" href="/museum/records">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {overview.records.map((record) => (
            <MuseumRecordCard key={record.key} record={record} />
          ))}
        </div>
      </MuseumSection>

      <MuseumSection icon={<LandmarkIcon className="text-primary size-5" />} title="Grandes Momentos" href="/museum/moments">
        {overview.moments.length === 0 ? (
          <EmptyState icon={LandmarkIcon} label="Nenhum grande momento registrado ainda." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.moments.map((moment) => (
              <MuseumMomentCard key={moment.id} moment={moment} />
            ))}
          </div>
        )}
      </MuseumSection>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RankingCard
          icon={<TrophyIcon className="text-primary size-4" />}
          title="Clubes com mais títulos"
          href="/statistics/clubs"
          entries={overview.topClubsByTitles.slice(0, 5).map((r) => ({ key: r.squad.id, label: r.squad.name, value: `${r.count}×` }))}
        />
        <RankingCard
          icon={<ArrowRightLeftIcon className="text-primary size-4" />}
          title="Maiores transferências"
          href="/statistics/transfers"
          entries={overview.biggestTransfers.map((t) => ({
            key: t.id,
            label: t.playerName,
            value: t.value != null ? formatMoney(t.value) : "—",
          }))}
        />
      </div>

      <MuseumSection icon={<StarIcon className="text-primary size-5" />} title="Hall da Fama" href="/museum/hall-of-fame">
        {legends.length === 0 ? (
          <EmptyState icon={StarIcon} label="Nenhum membro oficial ainda." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {legends.slice(0, 3).map((entry) => (
              <HallOfFameCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </MuseumSection>
    </div>
  );
}
