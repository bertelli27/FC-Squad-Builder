"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { TrophyIcon, XIcon, ShieldIcon, ChartNoAxesColumnIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatSeasonLabel } from "@/lib/season";
import { ageAtSeason } from "@/lib/player-age";
import { stintTotals } from "@/lib/career";
import { AddCareerTitleDialog } from "./add-career-title-dialog";
import type { CareerCompetitionStatsVM, CareerStintVM, CareerTitleVM } from "./types";

interface CompetitionOption {
  id: string;
  name: string;
}

const NEW_COMPETITION = "__new__";

/**
 * A national-team year (§2/§3 etapa 5) — unlike a club stint, jogos/gols/
 * assistências are never entered as flat numbers here: they're always the
 * sum of this stint's CareerStintCompetitionStats rows (§4 "não quero
 * digitar o total manualmente"), same principle already used for club
 * stats (Season.wins, PlayerCompetitionStats) — see lib/career.ts.
 */
export function NationalTeamStintCard({
  careerId,
  stint,
  dateOfBirth,
  onUpdated,
  onTitleAdded,
  onTitleRemoved,
  onStatsAdded,
  onStatsChanged,
  onStatsRemoved,
  onRemove,
}: {
  careerId: string;
  stint: CareerStintVM;
  /** §19 — age shown next to the season label, recomputed from the player's date of birth. */
  dateOfBirth?: string | null;
  onUpdated: (patch: Partial<CareerStintVM>) => void;
  onTitleAdded: (title: CareerTitleVM) => void;
  onTitleRemoved: (titleId: string) => void;
  onStatsAdded: (stats: CareerCompetitionStatsVM) => void;
  onStatsChanged: (statsId: string, patch: Partial<CareerCompetitionStatsVM>) => void;
  onStatsRemoved: (statsId: string) => void;
  onRemove: (stint: CareerStintVM, confirm: ReturnType<typeof useConfirmDialog>["confirm"]) => void;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const age = dateOfBirth ? ageAtSeason(dateOfBirth, stint.startYear, stint.calendar) : null;
  const [addTitleOpen, setAddTitleOpen] = useState(false);
  const [addingStats, setAddingStats] = useState(false);
  const [summary, setSummary] = useState(stint.summary ?? "");
  const summaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current);
    };
  }, []);

  function saveSummary(next: string) {
    if (next === (stint.summary ?? "")) return;
    onUpdated({ summary: next });
    fetch(`/api/careers/${careerId}/stints/${stint.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: next || null }),
    }).then((res) => {
      if (!res.ok) toast.error("Não foi possível salvar o resumo.");
    });
  }

  function handleSummaryChange(next: string) {
    setSummary(next);
    if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current);
    summaryTimeoutRef.current = setTimeout(() => saveSummary(next), 1000);
  }

  function handleSummaryBlur() {
    if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current);
    saveSummary(summary);
  }

  async function handleRemoveTitle(titleId: string, competitionName: string) {
    const ok = await confirm({
      title: `Remover o título de ${competitionName}?`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;
    onTitleRemoved(titleId);
    const res = await fetch(`/api/careers/${careerId}/stints/${stint.id}/titles/${titleId}`, {
      method: "DELETE",
    });
    if (!res.ok) toast.error("Não foi possível remover o título.");
  }

  function saveStatField(statsId: string, field: "appearances" | "goals" | "assists", raw: string) {
    const value = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    onStatsChanged(statsId, { [field]: value });
    fetch(`/api/careers/${careerId}/stints/${stint.id}/competition-stats/${statsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).then((res) => {
      if (!res.ok) toast.error("Não foi possível salvar a estatística.");
    });
  }

  async function handleRemoveStats(statsId: string, competitionName: string) {
    const ok = await confirm({
      title: `Remover as estatísticas de ${competitionName}?`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;
    onStatsRemoved(statsId);
    const res = await fetch(`/api/careers/${careerId}/stints/${stint.id}/competition-stats/${statsId}`, {
      method: "DELETE",
    });
    if (!res.ok) toast.error("Não foi possível remover a estatística.");
  }

  const total = stintTotals(stint);

  return (
    <Card className="group/stint gap-0 py-0">
      <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {stint.clubLogoUrl ? (
            <Image
              src={stint.clubLogoUrl}
              alt={stint.clubName}
              width={24}
              height={24}
              className="size-6 object-contain"
              unoptimized
            />
          ) : (
            <ShieldIcon className="text-muted-foreground size-6" />
          )}
          {stint.clubName}
          <span className="text-muted-foreground text-sm font-normal">
            {formatSeasonLabel(stint.startYear, stint.calendar)}
            {age != null && ` · ${age} anos`}
          </span>
        </CardTitle>
        <button
          type="button"
          onClick={() => onRemove(stint, confirm)}
          aria-label={`Remover ano na seleção ${stint.clubName}`}
          className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover/stint:opacity-100"
        >
          <XIcon className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
              <ChartNoAxesColumnIcon className="size-3.5" />
              Estatísticas por competição
            </h3>
            {!addingStats && (
              <Button size="xs" variant="outline" onClick={() => setAddingStats(true)}>
                + Adicionar
              </Button>
            )}
          </div>

          {stint.competitionStats.length === 0 && !addingStats ? (
            <p className="text-muted-foreground text-xs">Nenhuma competição registrada neste ano.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {stint.competitionStats.length > 0 && (
                <div className="text-muted-foreground grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem_1.25rem] gap-1 px-1 text-[10px] font-semibold tracking-wide uppercase">
                  <span>Competição</span>
                  <span className="text-center">Jogos</span>
                  <span className="text-center">Gols</span>
                  <span className="text-center">Assist.</span>
                  <span />
                </div>
              )}
              {stint.competitionStats.map((s) => (
                <div
                  key={s.id}
                  className="hover:bg-accent/30 group/stats-row grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem_1.25rem] items-center gap-1 rounded-md px-1 py-0.5"
                >
                  <span className="truncate text-sm">{s.competition.name}</span>
                  <Input
                    type="number"
                    min={0}
                    value={s.appearances}
                    onChange={(e) => saveStatField(s.id, "appearances", e.target.value)}
                    className="h-7 px-1 text-center text-xs"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={s.goals}
                    onChange={(e) => saveStatField(s.id, "goals", e.target.value)}
                    className="h-7 px-1 text-center text-xs"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={s.assists}
                    onChange={(e) => saveStatField(s.id, "assists", e.target.value)}
                    className="h-7 px-1 text-center text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStats(s.id, s.competition.name)}
                    aria-label={`Remover estatísticas de ${s.competition.name}`}
                    className="text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 transition-opacity group-hover/stats-row:opacity-100"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ))}
              {stint.competitionStats.length > 0 && (
                <div className="grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem_1.25rem] items-center gap-1 border-t px-1 pt-1 text-sm font-bold">
                  <span>Total</span>
                  <span className="text-center">{total.appearances}</span>
                  <span className="text-center">{total.goals}</span>
                  <span className="text-center">{total.assists}</span>
                  <span />
                </div>
              )}
            </div>
          )}

          {addingStats && (
            <AddCompetitionStatsForm
              careerId={careerId}
              stintId={stint.id}
              existingCompetitionIds={stint.competitionStats.map((s) => s.competition.id)}
              onAdded={(stats) => {
                onStatsAdded(stats);
                setAddingStats(false);
              }}
              onCancel={() => setAddingStats(false)}
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-heading text-xs font-semibold tracking-wide uppercase">
              Títulos
            </span>
            <Button size="xs" variant="outline" onClick={() => setAddTitleOpen(true)}>
              + Adicionar
            </Button>
          </div>
          {stint.titles.length === 0 ? (
            <p className="text-muted-foreground text-xs">Nenhum título nesse ano.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {stint.titles.map((title) => (
                <li
                  key={title.id}
                  className="group/title bg-muted/40 flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2 text-xs"
                >
                  <TrophyIcon className="size-3 shrink-0" />
                  {title.competition.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTitle(title.id, title.competition.name)}
                    aria-label={`Remover título de ${title.competition.name}`}
                    className="text-muted-foreground hover:text-destructive flex size-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/title:opacity-100"
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground font-heading text-xs font-semibold tracking-wide uppercase">
            Resumo do ano
          </span>
          <Textarea
            value={summary}
            onChange={(e) => handleSummaryChange(e.target.value)}
            onBlur={handleSummaryBlur}
            placeholder="Como foi esse ano pela seleção..."
            className="min-h-20"
          />
        </div>
      </CardContent>

      <AddCareerTitleDialog
        careerId={careerId}
        stintId={stint.id}
        open={addTitleOpen}
        onOpenChange={setAddTitleOpen}
        onAdded={onTitleAdded}
      />
      {dialog}
    </Card>
  );
}

function AddCompetitionStatsForm({
  careerId,
  stintId,
  existingCompetitionIds,
  onAdded,
  onCancel,
}: {
  careerId: string;
  stintId: string;
  existingCompetitionIds: string[];
  onAdded: (stats: CareerCompetitionStatsVM) => void;
  onCancel: () => void;
}) {
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [selected, setSelected] = useState<string>(NEW_COMPETITION);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/competitions")
      .then((res) => (res.ok ? res.json() : { competitions: [] }))
      .then((data) => setCompetitions(data.competitions ?? []))
      .catch(() => {});
  }, []);

  const availableCompetitions = competitions.filter((c) => !existingCompetitionIds.includes(c.id));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const isNew = selected === NEW_COMPETITION;
    if (isNew && !newName.trim()) {
      toast.error("Dê um nome à competição.");
      return;
    }

    setSaving(true);
    fetch(`/api/careers/${careerId}/stints/${stintId}/competition-stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isNew ? { competitionName: newName } : { competitionId: selected }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => onAdded(data.stats))
      .catch(() => toast.error("Não foi possível adicionar a competição."))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={handleSubmit} className="bg-muted/30 flex flex-col gap-2 rounded-lg p-2">
      <Select value={selected} onValueChange={(v) => v && setSelected(v)}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue>
            {(v: string) =>
              v === NEW_COMPETITION ? "Nova competição" : (competitions.find((c) => c.id === v)?.name ?? v)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NEW_COMPETITION}>+ Nova competição</SelectItem>
          {availableCompetitions.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected === NEW_COMPETITION && (
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex: Eliminatórias, Amistosos..."
          className="h-8 text-sm"
          autoFocus
        />
      )}

      <div className="flex gap-2">
        <Button type="submit" size="xs" disabled={saving}>
          {saving ? "Adicionando…" : "Adicionar"}
        </Button>
        <Button type="button" size="xs" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
