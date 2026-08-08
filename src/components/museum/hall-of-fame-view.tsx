"use client";

import { useState } from "react";
import { StarIcon, SparklesIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MuseumSection } from "./museum-section";
import { HallOfFameCard, type HallOfFameEntryVM } from "./hall-of-fame-card";
import { HallOfFameCandidateCard } from "./hall-of-fame-candidate-card";
import { HallOfFameEntryDialog } from "./hall-of-fame-entry-dialog";
import type { HallOfFameCandidateRow } from "@/services/hall-of-fame.service";

/**
 * Etapa 10.6 (§17/§18/§19) — "Lendas" (membros oficiais, com
 * adicionar/editar/excluir) + "Candidatos" (calculados, nunca
 * persistidos) na mesma tela, mesmo padrão de estado local de
 * `TimelineView` (a página server component busca uma vez, este
 * componente cliente atualiza a lista localmente ao salvar/excluir, sem
 * um novo round-trip de leitura).
 */
export function HallOfFameView({
  initialEntries,
  candidates,
  playerStats,
}: {
  initialEntries: HallOfFameEntryVM[];
  candidates: HallOfFameCandidateRow[];
  playerStats: Record<string, { label: string; value: string | number }[]>;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HallOfFameEntryVM | null>(null);
  const [prefillHonoree, setPrefillHonoree] = useState<{ cachedPlayerId: string; name: string; photoUrl: string | null } | null>(null);

  function openCreate() {
    setEditingEntry(null);
    setPrefillHonoree(null);
    setDialogOpen(true);
  }
  function openEdit(entry: HallOfFameEntryVM) {
    setEditingEntry(entry);
    setPrefillHonoree(null);
    setDialogOpen(true);
  }
  function openFromCandidate(candidate: HallOfFameCandidateRow) {
    setEditingEntry(null);
    setPrefillHonoree({
      cachedPlayerId: candidate.cachedPlayer.id,
      name: candidate.cachedPlayer.name,
      photoUrl: candidate.cachedPlayer.photoUrl,
    });
    setDialogOpen(true);
  }
  function handleSaved(entry: HallOfFameEntryVM) {
    setEntries((prev) => (prev.some((e) => e.id === entry.id) ? prev.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...prev]));
  }
  function handleDeleted(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const officialPlayerIds = new Set(entries.map((e) => e.cachedPlayer?.id).filter(Boolean));
  const visibleCandidates = candidates.filter((c) => !officialPlayerIds.has(c.cachedPlayer.id));

  return (
    <div className="flex flex-col gap-8">
      <MuseumSection icon={<StarIcon className="text-primary size-5" />} title="Lendas">
        <div className="flex justify-end">
          <Button type="button" size="sm" onClick={openCreate}>
            + Adicionar ao Hall da Fama
          </Button>
        </div>
        {entries.length === 0 ? (
          <EmptyState icon={StarIcon} label="Nenhum membro oficial ainda." />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {entries.map((entry) => (
              <HallOfFameCard
                key={entry.id}
                entry={entry}
                stats={entry.cachedPlayer ? playerStats[entry.cachedPlayer.id] : undefined}
                actions={
                  <Button type="button" size="xs" variant="ghost" onClick={() => openEdit(entry)}>
                    <PencilIcon className="size-3.5" />
                    Editar
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </MuseumSection>

      <MuseumSection icon={<SparklesIcon className="text-primary size-5" />} title="Candidatos">
        {visibleCandidates.length === 0 ? (
          <EmptyState
            icon={SparklesIcon}
            label="Nenhum candidato ainda — a lista cresce sozinha conforme mais estatística real é cadastrada."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visibleCandidates.map((candidate) => (
              <HallOfFameCandidateCard key={candidate.cachedPlayer.id} candidate={candidate} onAdd={() => openFromCandidate(candidate)} />
            ))}
          </div>
        )}
      </MuseumSection>

      {dialogOpen && (
        <HallOfFameEntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entry={editingEntry}
          initialHonoree={prefillHonoree}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
