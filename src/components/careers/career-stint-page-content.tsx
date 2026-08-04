"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TrophyIcon, XIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlayerStatsSection } from "@/components/player-card/player-stats-section";
import { SeasonTitlesCard } from "@/components/squad-builder/season-titles-card";
import { NumberField } from "./club-stint-card";
import { AddCareerTitleDialog } from "./add-career-title-dialog";
import { CareerStintSummaryEditor } from "./career-stint-summary-editor";
import type { CareerCompetitionStatsVM, CareerStintVM, CareerTitleVM } from "./types";

const NEW_COMPETITION = "__new__";

/**
 * §29-§36: the stint's own page. When `linkedSeason` is present, stats and
 * títulos are the exact same live data/components the Modo Clubes season
 * page uses (§18-§23/§47/§48 — no duplication); otherwise this falls back
 * to the stint's own fields exactly as the workspace card already does
 * (unchanged since etapa 4/5, for stints that predate this etapa or were
 * never linked to a real club).
 */
export function CareerStintPageContent({
  careerId,
  stint: initialStint,
  linkedSeason,
}: {
  careerId: string;
  stint: CareerStintVM;
  linkedSeason: {
    id: string;
    squadId: string;
    squadPlayerId: string | null;
    titles: { id: string; competition: { id: string; name: string; trophyImageUrl: string | null } }[];
  } | null;
}) {
  const [stint, setStint] = useState(initialStint);

  return (
    <div className="flex flex-col gap-6">
      {linkedSeason && (
        <Link
          href={`/squads/${linkedSeason.squadId}/seasons/${linkedSeason.id}`}
          className="text-primary flex w-fit items-center gap-1.5 text-sm underline underline-offset-2"
        >
          <ExternalLinkIcon className="size-3.5" />
          Ver temporada do clube
        </Link>
      )}

      {linkedSeason ? (
        linkedSeason.squadPlayerId ? (
          <Card className="gap-0 py-0">
            <CardContent className="py-4">
              <PlayerStatsSection seasonId={linkedSeason.id} squadPlayerId={linkedSeason.squadPlayerId} />
            </CardContent>
          </Card>
        ) : (
          <p className="text-muted-foreground text-sm">
            Não foi possível encontrar o jogador no elenco desta temporada.
          </p>
        )
      ) : stint.kind === "nationalTeam" ? (
        <UnlinkedNationalStats careerId={careerId} stint={stint} onStintUpdated={setStint} />
      ) : (
        <UnlinkedClubStats careerId={careerId} stint={stint} onStintUpdated={setStint} />
      )}

      {linkedSeason ? (
        <SeasonTitlesCard seasonId={linkedSeason.id} titles={linkedSeason.titles} />
      ) : (
        <UnlinkedTitles careerId={careerId} stint={stint} onStintUpdated={setStint} />
      )}

      <CareerStintSummaryEditor careerId={careerId} stintId={stint.id} summary={stint.summary} />
    </div>
  );
}

function UnlinkedClubStats({
  careerId,
  stint,
  onStintUpdated,
}: {
  careerId: string;
  stint: CareerStintVM;
  onStintUpdated: (updater: (prev: CareerStintVM) => CareerStintVM) => void;
}) {
  function saveField(field: "appearances" | "goals" | "assists", raw: string) {
    const value = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    onStintUpdated((prev) => ({ ...prev, [field]: value }));
    fetch(`/api/careers/${careerId}/stints/${stint.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).then((res) => {
      if (!res.ok) toast.error("Não foi possível salvar.");
    });
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="text-base">Estatísticas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4 py-4">
        <NumberField label="Jogos" value={stint.appearances} onChange={(v) => saveField("appearances", v)} />
        <NumberField label="Gols" value={stint.goals} onChange={(v) => saveField("goals", v)} />
        <NumberField label="Assistências" value={stint.assists} onChange={(v) => saveField("assists", v)} />
      </CardContent>
    </Card>
  );
}

function UnlinkedNationalStats({
  careerId,
  stint,
  onStintUpdated,
}: {
  careerId: string;
  stint: CareerStintVM;
  onStintUpdated: (updater: (prev: CareerStintVM) => CareerStintVM) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [competitions, setCompetitions] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState(NEW_COMPETITION);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const total = stint.competitionStats.reduce(
    (acc, s) => ({
      appearances: acc.appearances + s.appearances,
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
    }),
    { appearances: 0, goals: 0, assists: 0 },
  );

  function saveField(statsId: string, field: "appearances" | "goals" | "assists", raw: string) {
    const value = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    onStintUpdated((prev) => ({
      ...prev,
      competitionStats: prev.competitionStats.map((s) => (s.id === statsId ? { ...s, [field]: value } : s)),
    }));
    fetch(`/api/careers/${careerId}/stints/${stint.id}/competition-stats/${statsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).then((res) => {
      if (!res.ok) toast.error("Não foi possível salvar.");
    });
  }

  function handleRemove(statsId: string) {
    onStintUpdated((prev) => ({
      ...prev,
      competitionStats: prev.competitionStats.filter((s) => s.id !== statsId),
    }));
    fetch(`/api/careers/${careerId}/stints/${stint.id}/competition-stats/${statsId}`, { method: "DELETE" }).then(
      (res) => {
        if (!res.ok) toast.error("Não foi possível remover.");
      },
    );
  }

  function openAdd() {
    setAdding(true);
    fetch("/api/competitions")
      .then((res) => (res.ok ? res.json() : { competitions: [] }))
      .then((data) => setCompetitions(data.competitions ?? []))
      .catch(() => {});
  }

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const isNew = selected === NEW_COMPETITION;
    if (isNew && !newName.trim()) {
      toast.error("Dê um nome à competição.");
      return;
    }
    setSaving(true);
    fetch(`/api/careers/${careerId}/stints/${stint.id}/competition-stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isNew ? { competitionName: newName } : { competitionId: selected }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { stats: CareerCompetitionStatsVM }) => {
        onStintUpdated((prev) => ({ ...prev, competitionStats: [...prev.competitionStats, data.stats] }));
        setAdding(false);
        setSelected(NEW_COMPETITION);
        setNewName("");
      })
      .catch(() => toast.error("Não foi possível adicionar a competição."))
      .finally(() => setSaving(false));
  }

  const availableCompetitions = competitions.filter(
    (c) => !stint.competitionStats.some((s) => s.competition.id === c.id),
  );

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
        <CardTitle className="text-base">Estatísticas por competição</CardTitle>
        {!adding && (
          <Button size="xs" variant="outline" onClick={openAdd}>
            + Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 py-4">
        {stint.competitionStats.length === 0 && !adding ? (
          <p className="text-muted-foreground text-sm">Nenhuma competição registrada.</p>
        ) : (
          <>
            {stint.competitionStats.length > 0 && (
              <div className="text-muted-foreground grid grid-cols-[1fr_3rem_3rem_3rem_1.5rem] gap-1 px-1 text-xs font-semibold tracking-wide uppercase">
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
                className="hover:bg-accent/30 group/row grid grid-cols-[1fr_3rem_3rem_3rem_1.5rem] items-center gap-1 rounded-md px-1 py-1"
              >
                <span className="truncate text-sm">{s.competition.name}</span>
                <Input
                  type="number"
                  min={0}
                  value={s.appearances}
                  onChange={(e) => saveField(s.id, "appearances", e.target.value)}
                  className="h-7 px-1 text-center text-xs"
                />
                <Input
                  type="number"
                  min={0}
                  value={s.goals}
                  onChange={(e) => saveField(s.id, "goals", e.target.value)}
                  className="h-7 px-1 text-center text-xs"
                />
                <Input
                  type="number"
                  min={0}
                  value={s.assists}
                  onChange={(e) => saveField(s.id, "assists", e.target.value)}
                  className="h-7 px-1 text-center text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(s.id)}
                  aria-label={`Remover ${s.competition.name}`}
                  className="text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 transition-opacity group-hover/row:opacity-100"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            ))}
            {stint.competitionStats.length > 0 && (
              <div className="grid grid-cols-[1fr_3rem_3rem_3rem_1.5rem] items-center gap-1 border-t px-1 pt-1 text-sm font-bold">
                <span>Total</span>
                <span className="text-center">{total.appearances}</span>
                <span className="text-center">{total.goals}</span>
                <span className="text-center">{total.assists}</span>
                <span />
              </div>
            )}
          </>
        )}

        {adding && (
          <form onSubmit={handleAdd} className="bg-muted/30 flex flex-col gap-2 rounded-lg p-2">
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
              <Button type="button" size="xs" variant="outline" onClick={() => setAdding(false)} disabled={saving}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function UnlinkedTitles({
  careerId,
  stint,
  onStintUpdated,
}: {
  careerId: string;
  stint: CareerStintVM;
  onStintUpdated: (updater: (prev: CareerStintVM) => CareerStintVM) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  async function handleRemove(title: CareerTitleVM) {
    const ok = await confirm({
      title: `Remover o título de ${title.competition.name}?`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;
    onStintUpdated((prev) => ({ ...prev, titles: prev.titles.filter((t) => t.id !== title.id) }));
    const res = await fetch(`/api/careers/${careerId}/stints/${stint.id}/titles/${title.id}`, { method: "DELETE" });
    if (!res.ok) toast.error("Não foi possível remover o título.");
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
        <CardTitle className="text-base">Títulos</CardTitle>
        <Button size="xs" variant="outline" onClick={() => setAddOpen(true)}>
          + Adicionar
        </Button>
      </CardHeader>
      <CardContent className="py-4">
        {stint.titles.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum título nesta passagem.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {stint.titles.map((title) => (
              <li
                key={title.id}
                className="group/title bg-muted/40 flex items-center gap-1.5 rounded-full border py-1 pr-1 pl-2 text-sm"
              >
                <TrophyIcon className="size-3.5 shrink-0" />
                {title.competition.name}
                <button
                  type="button"
                  onClick={() => handleRemove(title)}
                  aria-label={`Remover título de ${title.competition.name}`}
                  className="text-muted-foreground hover:text-destructive flex size-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/title:opacity-100"
                >
                  <XIcon className="size-2.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AddCareerTitleDialog
        careerId={careerId}
        stintId={stint.id}
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(title) => onStintUpdated((prev) => ({ ...prev, titles: [...prev.titles, title] }))}
      />
      {dialog}
    </Card>
  );
}
