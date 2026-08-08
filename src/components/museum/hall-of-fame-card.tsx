import Link from "next/link";
import { StarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/player-card/player-avatar";

export interface HallOfFameEntryVM {
  id: string;
  title: string;
  description: string | null;
  year: number;
  cachedPlayer: { id: string; name: string; photoUrl: string | null } | null;
  coach: { id: string; name: string; photoUrl: string | null } | null;
  squad: { id: string; name: string; logoUrl: string | null } | null;
}

/**
 * Etapa 10.6 (§17) — um membro oficial do Hall da Fama. `stats` é opcional
 * e, quando presente, é sempre lido AO VIVO de `statisticsService` pela
 * página que monta a lista (nunca copiado pra `HallOfFameEntry` — a
 * entrada em si guarda só o reconhecimento). `actions` é um slot livre
 * (botões de editar/excluir) preenchido pelo componente-pai com estado
 * (`HallOfFameView`), pra este card continuar puramente apresentacional.
 */
export function HallOfFameCard({
  entry,
  stats,
  actions,
}: {
  entry: HallOfFameEntryVM;
  stats?: { label: string; value: string | number }[];
  actions?: React.ReactNode;
}) {
  const honoree = entry.cachedPlayer ?? entry.coach;
  const honoreeHref = entry.cachedPlayer ? `/players/${entry.cachedPlayer.id}` : entry.coach ? `/coaches/${entry.coach.id}` : null;
  if (!honoree) return null;

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <PlayerAvatar src={honoree.photoUrl} name={honoree.name} size="lg" />
            <div className="flex min-w-0 flex-col gap-0.5">
              {honoreeHref ? (
                <Link href={honoreeHref} className="hover:text-primary truncate font-semibold hover:underline">
                  {honoree.name}
                </Link>
              ) : (
                <span className="truncate font-semibold">{honoree.name}</span>
              )}
              <Badge variant="outline" className="w-fit">
                {entry.squad ? entry.squad.name : "Global"}
              </Badge>
            </div>
          </div>
          {actions}
        </div>

        <div className="flex items-center gap-1.5 text-sm">
          <StarIcon className="text-primary size-4 shrink-0" />
          <span className="font-medium">{entry.title}</span>
          <span className="text-muted-foreground">· {entry.year}</span>
        </div>

        {entry.description && <p className="text-muted-foreground text-sm">{entry.description}</p>}

        {stats && stats.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs">
            {stats.map((stat) => (
              <span key={stat.label} className="text-muted-foreground">
                <span className="text-foreground font-semibold">{stat.value}</span> {stat.label}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
