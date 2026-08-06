"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { TrophyIcon, ShieldIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { AddSeasonCompetitionDialog } from "./add-season-competition-dialog";

export interface SeasonCompetitionVM {
  id: string;
  competition: { id: string; name: string; logoUrl: string | null };
}

/**
 * Etapa 9 parte 4 (§1.2) — "Competições disputadas nesta temporada": ao
 * adicionar aqui, a competição passa a aparecer automaticamente nas
 * estatísticas de todo jogador do elenco desta temporada (ver
 * PlayerStatsSection) — não precisa mais cadastrar competição jogador por
 * jogador. Remover daqui não apaga estatística já preenchida de ninguém
 * (§1.2/service comment) — só some da lista de sugestão pra quem ainda não
 * tinha nada lançado.
 */
export function SeasonCompetitionsCard({
  seasonId,
  competitions: initialCompetitions,
}: {
  seasonId: string;
  competitions: SeasonCompetitionVM[];
}) {
  const [competitions, setCompetitions] = useState(initialCompetitions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function handleRemove(sc: SeasonCompetitionVM) {
    const ok = await confirm({
      title: `Remover ${sc.competition.name} desta temporada?`,
      description: "Estatísticas de jogadores já preenchidas para esta competição não são apagadas.",
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;

    setCompetitions((prev) => prev.filter((c) => c.id !== sc.id));
    const res = await fetch(`/api/seasons/${seasonId}/competitions/${sc.id}`, { method: "DELETE" });
    if (!res.ok) {
      setCompetitions((prev) => [...prev, sc]);
      toast.error("Não foi possível remover a competição.");
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="text-primary size-4" />
          Competições da temporada ({competitions.length})
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          + Adicionar
        </Button>
      </CardHeader>
      <CardContent className="py-4">
        {competitions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhuma competição definida ainda. Adicione as competições que este elenco disputa nesta temporada
            para que apareçam automaticamente nas estatísticas de cada jogador.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {competitions.map((sc) => (
              <li
                key={sc.id}
                className="group/comp bg-muted/40 flex items-center gap-2 rounded-full border py-1 pr-1.5 pl-2.5 text-sm"
              >
                {sc.competition.logoUrl ? (
                  <Image
                    src={sc.competition.logoUrl}
                    alt=""
                    width={18}
                    height={18}
                    className="size-[18px] shrink-0 object-contain"
                    unoptimized
                  />
                ) : (
                  <ShieldIcon className="text-muted-foreground size-[18px] shrink-0" strokeWidth={1.5} />
                )}
                <span className="max-w-40 truncate font-medium">{sc.competition.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(sc)}
                  aria-label={`Remover ${sc.competition.name} da temporada`}
                  className="text-muted-foreground hover:text-destructive flex size-5 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/comp:opacity-100"
                >
                  <XIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AddSeasonCompetitionDialog
        seasonId={seasonId}
        existingCompetitionIds={competitions.map((c) => c.competition.id)}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdded={(sc) => setCompetitions((prev) => [...prev, sc])}
      />
      {dialog}
    </Card>
  );
}
