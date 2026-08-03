"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { TrophyIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { AddTitleDialog } from "./add-title-dialog";

export interface SeasonTitleVM {
  id: string;
  competition: {
    id: string;
    name: string;
    trophyImageUrl: string | null;
  };
}

/** §1/§2: títulos conquistados NESTA temporada, cada um com o troféu real da competição (se cadastrado). */
export function SeasonTitlesCard({
  seasonId,
  titles: initialTitles,
}: {
  seasonId: string;
  titles: SeasonTitleVM[];
}) {
  const [titles, setTitles] = useState(initialTitles);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function handleRemove(title: SeasonTitleVM) {
    const ok = await confirm({
      title: `Remover o título de ${title.competition.name}?`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;

    setTitles((prev) => prev.filter((t) => t.id !== title.id));
    const res = await fetch(`/api/seasons/${seasonId}/titles/${title.id}`, { method: "DELETE" });
    if (!res.ok) {
      setTitles((prev) => [...prev, title]);
      toast.error("Não foi possível remover o título.");
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="text-primary size-4" />
          Títulos da temporada ({titles.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          + Adicionar
        </Button>
      </CardHeader>
      <CardContent className="py-4">
        {titles.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum título registrado nesta temporada.</p>
        ) : (
          <ul className="flex flex-wrap gap-3">
            {titles.map((title) => (
              <li
                key={title.id}
                className="group/title bg-muted/40 relative flex flex-col items-center gap-1.5 rounded-lg border p-3 pt-2"
              >
                <button
                  type="button"
                  onClick={() => handleRemove(title)}
                  aria-label={`Remover título de ${title.competition.name}`}
                  className="text-muted-foreground hover:text-destructive absolute top-1 right-1 flex size-5 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/title:opacity-100"
                >
                  <XIcon className="size-3.5" />
                </button>
                {title.competition.trophyImageUrl ? (
                  <Image
                    src={title.competition.trophyImageUrl}
                    alt={title.competition.name}
                    width={40}
                    height={40}
                    className="size-10 object-contain"
                    unoptimized
                  />
                ) : (
                  <TrophyIcon className="text-muted-foreground size-10" strokeWidth={1.25} />
                )}
                <span className="font-heading max-w-28 text-center text-xs font-semibold leading-tight">
                  {title.competition.name}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AddTitleDialog
        seasonId={seasonId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdded={(title) => setTitles((prev) => [...prev, title])}
      />
      {dialog}
    </Card>
  );
}
