import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { competitionService } from "@/services/competition.service";
import { ManagementTrophiesClient } from "@/components/management/management-trophies-client";

export const dynamic = "force-dynamic";

export default async function ManagementTrophiesPage() {
  const competitions = await competitionService.listCompetitions();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/management"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        Gerenciamento
      </Link>

      <div className="flex items-baseline gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Troféus / Taças</h1>
        {competitions.length > 0 && (
          <span className="text-muted-foreground text-sm">({competitions.length})</span>
        )}
      </div>

      <ManagementTrophiesClient
        competitions={competitions.map((c) => ({ id: c.id, name: c.name, trophyImageUrl: c.trophyImageUrl }))}
      />
    </div>
  );
}
