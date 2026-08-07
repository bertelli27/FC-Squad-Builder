import Link from "next/link";
import Image from "next/image";
import { TrophyIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export interface PlayerTitleData {
  id: string;
  competition: { id: string; name: string; trophyImageUrl: string | null };
  season: { id: string; startYear: number };
  squad: { id: string; name: string };
}

/** Etapa 10.2 — aba "Títulos": dividido Clubes/Seleções, com a ressalva de que é "título do clube na temporada em que o jogador estava no elenco". */
export function PlayerTitlesTab({ club, nationalTeam }: { club: PlayerTitleData[]; nationalTeam: PlayerTitleData[] }) {
  if (club.length === 0 && nationalTeam.length === 0) {
    return <EmptyState icon={TrophyIcon} label="Nenhum título registrado ainda." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-xs">
        Títulos do clube/seleção nas temporadas em que o jogador esteve no elenco — não necessariamente todos com
        participação direta em campo.
      </p>
      {club.length > 0 && <TitleGroup title="Clubes" titles={club} />}
      {nationalTeam.length > 0 && <TitleGroup title="Seleções" titles={nationalTeam} />}
    </div>
  );
}

function TitleGroup({ title, titles }: { title: string; titles: PlayerTitleData[] }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-heading text-sm font-semibold">{title}</h3>
      <ul className="flex flex-wrap gap-3">
        {titles.map((t) => (
          <li key={t.id}>
            <Link
              href={`/squads/${t.squad.id}/seasons/${t.season.id}`}
              className="bg-muted/40 hover:bg-accent/50 flex flex-col items-center gap-1.5 rounded-lg border p-3 pt-2"
            >
              {t.competition.trophyImageUrl ? (
                <Image
                  src={t.competition.trophyImageUrl}
                  alt={t.competition.name}
                  width={40}
                  height={40}
                  className="size-10 object-contain"
                  unoptimized
                />
              ) : (
                <TrophyIcon className="text-muted-foreground size-10" strokeWidth={1.25} />
              )}
              <span className="font-heading max-w-28 text-center text-xs font-semibold leading-tight">
                {t.competition.name}
              </span>
              <span className="text-muted-foreground text-[11px]">
                {t.squad.name} · {t.season.startYear}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
