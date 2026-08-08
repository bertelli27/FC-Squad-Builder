import Link from "next/link";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { Card, CardContent } from "@/components/ui/card";
import { MUSEUM_RECORD_META, type MuseumRecordVM } from "@/lib/museum";

/**
 * Etapa 10.6 — um recorde automático (Museu §2/§13/§23), mesmo componente
 * pra "Recordes Automáticos" e "Destaques" (são o mesmo conjunto de dados —
 * ver decisão de consolidação do plano). Todo número vem pronto em
 * `record.valueLabel`/`record.entity` (montado por `museumService`, que só
 * compõe `statisticsService`) — este componente só apresenta.
 */
export function MuseumRecordCard({ record }: { record: MuseumRecordVM }) {
  const meta = MUSEUM_RECORD_META[record.key];
  const Icon = meta.icon;
  const isClub = record.key === "mostClubTitles";
  const entity = record.entity;

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-center gap-3 py-4">
        <Icon className="text-primary size-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-muted-foreground text-xs">{meta.label}</span>
          {entity ? (
            <>
              <div className="flex items-center gap-2">
                {isClub ? (
                  <ClubBadge src={entity.imageUrl} name={entity.name} size="sm" />
                ) : (
                  <PlayerAvatar src={entity.imageUrl} name={entity.name} size="sm" />
                )}
                {entity.href ? (
                  <Link href={entity.href} className="hover:text-primary truncate text-sm font-semibold hover:underline">
                    {entity.name}
                  </Link>
                ) : (
                  <span className="truncate text-sm font-semibold">{entity.name}</span>
                )}
              </div>
              <span className="text-muted-foreground text-sm">{record.valueLabel}</span>
            </>
          ) : (
            <span className="text-muted-foreground text-sm">{record.valueLabel}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
