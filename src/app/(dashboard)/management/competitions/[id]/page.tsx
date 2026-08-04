import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ChevronLeft, ShieldIcon } from "lucide-react";
import { competitionService } from "@/services/competition.service";
import { CompetitionDetailTabs } from "@/components/management/competition-detail-tabs";

export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = { club: "🏟️ Clube", nationalTeam: "🌎 Seleção" };
const CATEGORY_LABELS: Record<string, string> = { international: "Internacional", national: "Nacional" };

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competition = await competitionService.getCompetition(id);
  if (!competition) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/management/competitions"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        Competições
      </Link>

      <div className="flex items-center gap-4">
        {competition.logoUrl ? (
          <Image
            src={competition.logoUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 object-contain"
            unoptimized
          />
        ) : (
          <ShieldIcon className="text-muted-foreground size-14 shrink-0" strokeWidth={1.25} />
        )}
        <div className="flex flex-col">
          <h1 className="font-heading text-2xl font-bold tracking-tight">{competition.name}</h1>
          <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-sm">
            {[
              competition.kind ? KIND_LABELS[competition.kind] : null,
              competition.category ? CATEGORY_LABELS[competition.category] : null,
              competition.organizer,
              competition.country,
            ]
              .filter(Boolean)
              .join(" · ") || "Não classificada"}
          </span>
        </div>
      </div>

      <CompetitionDetailTabs
        competition={{
          id: competition.id,
          name: competition.name,
          logoUrl: competition.logoUrl,
          trophyImageUrl: competition.trophyImageUrl,
          kind: competition.kind,
          category: competition.category,
          organizer: competition.organizer,
          country: competition.country,
          description: competition.description,
        }}
        champions={competition.champions.map((c) => ({
          id: c.id,
          year: c.year,
          standaloneName: c.standaloneName,
          standaloneLogoUrl: c.standaloneLogoUrl,
          standaloneCountry: c.standaloneCountry,
          season: c.season ? { id: c.season.id, squadId: c.season.squadId, startYear: c.season.startYear } : null,
        }))}
      />
    </div>
  );
}
