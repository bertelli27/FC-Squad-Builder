import Link from "next/link";
import Image from "next/image";
import { ShieldIcon, ChevronRightIcon } from "lucide-react";

export interface SquadDirectoryEntry {
  id: string;
  name: string;
  logoUrl: string | null;
  category: { name: string } | null;
  _count: { seasons: number; currentPlayers: number };
}

/** Etapa 10.1 (§Parte 10) — listagem simples de clubes/seleções pro Gerenciamento; criar/editar elenco em si continua só em Modo Clubes. */
export function SquadDirectoryList({ squads, emptyLabel }: { squads: SquadDirectoryEntry[]; emptyLabel: string }) {
  if (squads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <p className="text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <ul className="divide-border flex flex-col divide-y rounded-lg border">
      {squads.map((squad) => (
        <li key={squad.id}>
          <Link href={`/squads/${squad.id}`} className="hover:bg-accent/30 flex items-center gap-3 p-4">
            {squad.logoUrl ? (
              <Image src={squad.logoUrl} alt="" width={36} height={36} className="size-9 shrink-0 object-contain" unoptimized />
            ) : (
              <ShieldIcon className="text-muted-foreground size-9 shrink-0" strokeWidth={1.25} />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-semibold">{squad.name}</div>
              <div className="text-muted-foreground truncate text-xs">
                {[
                  squad.category?.name,
                  `${squad._count.seasons} ${squad._count.seasons === 1 ? "temporada" : "temporadas"}`,
                  squad._count.currentPlayers > 0
                    ? `${squad._count.currentPlayers} ${squad._count.currentPlayers === 1 ? "jogador atual" : "jogadores atuais"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
            <ChevronRightIcon className="text-muted-foreground size-4 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
