"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Copy, MoreVertical, Trash2, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatSeasonLabel } from "@/lib/season";
import { NewSeasonDialog, type DuplicateFromSeason } from "./new-season-dialog";

export interface SeasonCardData {
  id: string;
  startYear: number;
  formation: string;
  coachName: string | null;
  playerCount: number;
  /** Etapa 10.1 (§7/§8) — torneio pra qual esta temporada é a convocação, quando definido. */
  competitionId: string | null;
  competitionName: string | null;
}

export function SeasonsSection({
  squadId,
  seasonCalendar,
  isNationalTeam,
  seasons,
}: {
  squadId: string;
  seasonCalendar: string;
  /** Etapa 10.1 — só seleção ganha o seletor de torneio/convocação ao criar temporada. */
  isNationalTeam: boolean;
  seasons: SeasonCardData[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [duplicateFrom, setDuplicateFrom] = useState<DuplicateFromSeason | null>(null);
  const existingSeasons = seasons.map((s) => ({ startYear: s.startYear, competitionId: s.competitionId }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Temporadas {seasons.length > 0 && <span className="text-muted-foreground text-sm font-normal">({seasons.length})</span>}
        </h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <CalendarPlus className="size-4" />
          Nova temporada
        </Button>
      </div>

      {seasons.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <p className="text-muted-foreground">Este clube ainda não tem nenhuma temporada.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <CalendarPlus className="size-4" />
            Criar a primeira temporada
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => (
            <SeasonCard
              key={season.id}
              squadId={squadId}
              season={season}
              seasonCalendar={seasonCalendar}
              onDuplicate={() => setDuplicateFrom({ id: season.id, startYear: season.startYear })}
            />
          ))}
        </div>
      )}

      <NewSeasonDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        squadId={squadId}
        seasonCalendar={seasonCalendar}
        isNationalTeam={isNationalTeam}
        existingSeasons={existingSeasons}
      />
      <NewSeasonDialog
        open={duplicateFrom !== null}
        onOpenChange={(open) => !open && setDuplicateFrom(null)}
        squadId={squadId}
        seasonCalendar={seasonCalendar}
        isNationalTeam={isNationalTeam}
        existingSeasons={existingSeasons}
        duplicateFrom={duplicateFrom}
      />
    </div>
  );
}

function SeasonCard({
  squadId,
  season,
  seasonCalendar,
  onDuplicate,
}: {
  squadId: string;
  season: SeasonCardData;
  seasonCalendar: string;
  onDuplicate: () => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function handleDelete() {
    const label = formatSeasonLabel(season.startYear, seasonCalendar);
    const ok = await confirm({
      title: `Excluir a temporada ${label}?`,
      description: "O elenco e o técnico dessa temporada serão perdidos. Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;

    setIsDeleting(true);
    const res = await fetch(`/api/squads/${squadId}/seasons/${season.id}`, { method: "DELETE" });
    setIsDeleting(false);
    if (!res.ok) {
      toast.error("Não foi possível excluir a temporada.");
      return;
    }
    toast.success(`Temporada ${label} excluída.`);
    router.refresh();
  }

  return (
    <>
      <Card className="group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
        <div className="from-primary to-primary/40 h-1.5 bg-gradient-to-r" />
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2">
            <Link
              href={`/squads/${squadId}/seasons/${season.id}`}
              className="static after:absolute after:inset-0 hover:underline"
            >
              {formatSeasonLabel(season.startYear, seasonCalendar)}
              {season.competitionName && (
                <span className="text-muted-foreground ml-1.5 text-sm font-normal">— {season.competitionName}</span>
              )}
            </Link>
          </CardTitle>
          <CardAction className="relative z-10">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Mais ações"
                    className="opacity-0 transition-opacity group-hover:opacity-100 aria-expanded:opacity-100"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="size-4" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" disabled={isDeleting} onClick={handleDelete}>
                  <Trash2 className="size-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 pb-4 text-sm">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
              {season.formation}
            </Badge>
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="size-3.5" />
              {season.playerCount}
            </span>
          </div>
          {season.coachName && (
            <span className="text-muted-foreground flex items-center gap-1 truncate">
              <UserRound className="size-3.5 shrink-0" />
              {season.coachName}
            </span>
          )}
        </CardContent>
      </Card>
      {dialog}
    </>
  );
}
