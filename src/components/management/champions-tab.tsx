"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { PlusIcon, PencilIcon, Trash2Icon, ShieldIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { CountryFlag } from "@/components/ui/country-flag";
import { ChampionFormDialog } from "./champion-form-dialog";

export interface ChampionVM {
  id: string;
  year: number;
  standaloneName: string;
  standaloneLogoUrl: string | null;
  standaloneCountry: string | null;
  season: { id: string; squadId: string; startYear: number } | null;
}

/**
 * Etapa 9 (§40-53) — histórico de campeões da competição, sempre ordenado
 * cronologicamente (§52, já vem ordenado do servidor). Independente do
 * sistema de títulos (SeasonTitle/CareerTitle) — excluir uma edição daqui
 * nunca mexe em clube/seleção/elenco/jogador algum (§51).
 */
export function ChampionsTab({
  competitionId,
  champions: initialChampions,
}: {
  competitionId: string;
  champions: ChampionVM[];
}) {
  const [champions, setChampions] = useState(initialChampions);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ChampionVM | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(champion: ChampionVM) {
    setEditing(champion);
    setFormOpen(true);
  }

  function handleSaved(champion: ChampionVM) {
    setChampions((prev) => {
      const exists = prev.some((c) => c.id === champion.id);
      const next = exists ? prev.map((c) => (c.id === champion.id ? champion : c)) : [...prev, champion];
      return next.sort((a, b) => a.year - b.year);
    });
  }

  async function handleDelete(champion: ChampionVM) {
    const ok = await confirm({
      title: `Remover ${champion.year} — ${champion.standaloneName}?`,
      description: "Remove só este registro do histórico da competição. Não afeta clube, seleção, elenco ou jogadores.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;

    setChampions((prev) => prev.filter((c) => c.id !== champion.id));
    const res = await fetch(`/api/competitions/${competitionId}/champions/${champion.id}`, { method: "DELETE" });
    if (!res.ok) {
      setChampions((prev) => [...prev, champion].sort((a, b) => a.year - b.year));
      toast.error("Não foi possível remover.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold">Campeões ({champions.length})</h2>
        <Button size="sm" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Adicionar campeão
        </Button>
      </div>

      {champions.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">
          Nenhum campeão registrado ainda.
        </p>
      ) : (
        <ul className="divide-border flex flex-col divide-y rounded-lg border">
          {champions.map((champion) => {
            return (
              <li key={champion.id} className="hover:bg-accent/30 flex items-center gap-3 p-3">
                <span className="font-heading w-14 shrink-0 text-sm font-bold">{champion.year}</span>
                {champion.standaloneLogoUrl ? (
                  <Image
                    src={champion.standaloneLogoUrl}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 shrink-0 object-contain"
                    unoptimized
                  />
                ) : (
                  <ShieldIcon className="text-muted-foreground size-7 shrink-0" strokeWidth={1.25} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <CountryFlag nationality={champion.standaloneCountry} />
                    <span className="truncate">{champion.standaloneName}</span>
                  </div>
                  {champion.season ? (
                    <Link
                      href={`/squads/${champion.season.squadId}/seasons/${champion.season.id}`}
                      className="text-primary flex items-center gap-1 text-xs underline underline-offset-2"
                    >
                      Ver elenco
                      <ExternalLinkIcon className="size-3" />
                    </Link>
                  ) : (
                    <span className="text-muted-foreground text-xs">Sem elenco cadastrado</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(champion)}
                  aria-label={`Editar ${champion.year}`}
                  className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(champion)}
                  aria-label={`Excluir ${champion.year}`}
                  className="text-muted-foreground hover:text-destructive flex size-8 items-center justify-center rounded-full"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ChampionFormDialog
        key={editing?.id ?? "create"}
        competitionId={competitionId}
        editing={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={handleSaved}
      />
      {confirmDialog}
    </div>
  );
}
