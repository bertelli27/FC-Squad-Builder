"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import { TrophyIcon, XIcon, ShieldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatSeasonLabel } from "@/lib/season";
import { cn } from "@/lib/utils";
import { AddCareerTitleDialog } from "./add-career-title-dialog";
import type { CareerStintVM, CareerTitleVM } from "./types";

/** A club stint (§4 etapa 4) — flat, hand-entered appearances/goals/assists, unchanged since that etapa. */
export function ClubStintCard({
  careerId,
  stint,
  onUpdated,
  onTitleAdded,
  onTitleRemoved,
  onRemove,
}: {
  careerId: string;
  stint: CareerStintVM;
  onUpdated: (patch: Partial<CareerStintVM>) => void;
  onTitleAdded: (title: CareerTitleVM) => void;
  onTitleRemoved: (titleId: string) => void;
  onRemove: (stint: CareerStintVM, confirm: ReturnType<typeof useConfirmDialog>["confirm"]) => void;
}) {
  const { confirm, dialog } = useConfirmDialog();
  const [addTitleOpen, setAddTitleOpen] = useState(false);
  const [summary, setSummary] = useState(stint.summary ?? "");
  const summaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current);
    };
  }, []);

  function saveField(field: "appearances" | "goals" | "assists", raw: string) {
    const value = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    onUpdated({ [field]: value });
    fetch(`/api/careers/${careerId}/stints/${stint.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).then((res) => {
      if (!res.ok) toast.error("Não foi possível salvar.");
    });
  }

  // Same debounced-autosave shape as CareerSummary/SquadNotes (save 1s
  // after typing stops, and immediately on blur) — relying on blur alone
  // silently drops the edit if the field is never actually blurred before
  // the user navigates away (e.g. straight to another page).
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
          </span>
        </CardTitle>
        <button
          type="button"
          onClick={() => onRemove(stint, confirm)}
          aria-label={`Remover passagem por ${stint.clubName}`}
          className="text-muted-foreground hover:text-destructive opacity-0 transition-opacity group-hover/stint:opacity-100"
        >
          <XIcon className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <NumberField label="Jogos" value={stint.appearances} onChange={(v) => saveField("appearances", v)} />
          <NumberField label="Gols" value={stint.goals} onChange={(v) => saveField("goals", v)} />
          <NumberField label="Assistências" value={stint.assists} onChange={(v) => saveField("assists", v)} />
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
            <p className="text-muted-foreground text-xs">Nenhum título nesta passagem.</p>
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
            Resumo da temporada
          </span>
          <Textarea
            value={summary}
            onChange={(e) => handleSummaryChange(e.target.value)}
            onBlur={handleSummaryBlur}
            placeholder="Como foi essa temporada..."
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

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("font-heading h-10 w-16 text-center text-lg font-bold")}
        aria-label={label}
      />
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
