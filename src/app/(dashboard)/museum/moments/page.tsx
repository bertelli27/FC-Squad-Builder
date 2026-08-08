import Link from "next/link";
import { ChevronLeft, LandmarkIcon } from "lucide-react";
import { museumService } from "@/services/museum.service";
import { MuseumMomentCard } from "@/components/museum/museum-moment-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

/** Etapa 10.6 (§12) — Grandes Momentos: lista completa (já é uma seleção curada — highlight/categorias marcantes — não precisa de filtro extra, §16). */
export default async function MuseumMomentsPage() {
  const moments = await museumService.getGreatMoments(50);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/museum" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ChevronLeft className="size-4" />
        Museu
      </Link>

      <h1 className="font-heading text-2xl font-semibold tracking-tight">Grandes Momentos</h1>

      {moments.length === 0 ? (
        <EmptyState
          icon={LandmarkIcon}
          label='Nenhum grande momento registrado ainda — marque um evento como "destaque" (ou de categoria como fundação/título/campanha) na Timeline de um clube, jogador ou competição.'
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moments.map((moment) => (
            <MuseumMomentCard key={moment.id} moment={moment} />
          ))}
        </div>
      )}
    </div>
  );
}
