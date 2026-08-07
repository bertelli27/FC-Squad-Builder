import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRoundIcon, CalendarIcon } from "lucide-react";
import { coachService } from "@/services/coach.service";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProfileHeader } from "@/components/ui/profile-header";
import { formatSeasonLabel } from "@/lib/season";

export const dynamic = "force-dynamic";

/** Etapa 10.2 — perfil leve do técnico: nome/foto/link + toda temporada em que atuou. Sem abas (não pedido em detalhe). */
export default async function CoachProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coach = await coachService.getCoachDetail(id);
  if (!coach) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader
        avatar={<PlayerAvatar src={coach.photoUrl} name={coach.name} size="lg" />}
        title={coach.name}
        action={
          coach.externalLink && (
            <a
              href={coach.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm underline underline-offset-2"
            >
              Ver mais →
            </a>
          )
        }
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3 [.border-b]:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRoundIcon className="text-primary size-4" />
            Temporadas ({coach.seasons.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          {coach.seasons.length === 0 ? (
            <EmptyState icon={CalendarIcon} label="Nenhuma temporada registrada ainda." />
          ) : (
            <ul className="divide-border flex flex-col divide-y">
              {coach.seasons.map((season) => (
                <li key={season.id}>
                  <Link
                    href={`/squads/${season.squad.id}/seasons/${season.id}`}
                    className="hover:bg-accent/30 flex items-center gap-3 rounded-md p-2"
                  >
                    <ClubBadge src={season.squad.logoUrl} name={season.squad.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{season.squad.name}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {formatSeasonLabel(season.startYear, season.squad.seasonCalendar)}
                      </div>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">{season.formation}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
