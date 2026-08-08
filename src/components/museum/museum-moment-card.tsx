import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { timelineEventTypeIcon, timelineEventTypeLabel } from "@/lib/timeline";
import type { MuseumMomentVM } from "@/lib/museum";

/**
 * Etapa 10.6 — um evento de "Grandes Momentos"/"Recordes Históricos"
 * (Museu §11/§12) — sempre um `TimelineEvent` MANUAL (automáticos nunca
 * viram linha nessa tabela), lido cross-entity por `museumService`.
 * Reaproveita o mapeamento ícone/label de `lib/timeline.ts` em vez de
 * reinventar — layout em grid compacto, diferente do agrupamento por ano
 * da `TimelineView` (que é sempre de uma entidade só).
 */
export function MuseumMomentCard({ moment }: { moment: MuseumMomentVM }) {
  const Icon = timelineEventTypeIcon(moment.type);

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-2 py-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            {/* eslint-disable-next-line react-hooks/static-components -- Icon é só um lookup num Map estático (lib/timeline.ts), não um componente novo por render */}
            <Icon className="size-3" />
            {timelineEventTypeLabel(moment.type)}
          </Badge>
          <span className="text-muted-foreground text-xs">{moment.year}</span>
        </div>
        <p className="text-sm font-semibold">{moment.title}</p>
        {moment.description && <p className="text-muted-foreground text-xs">{moment.description}</p>}
        <Link href={moment.entity.href} className="text-primary text-xs hover:underline">
          {moment.entity.name}
        </Link>
      </CardContent>
    </Card>
  );
}
