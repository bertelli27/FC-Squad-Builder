"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { XIcon, ChartNoAxesColumnIcon, ShieldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface CompetitionOption {
  id: string;
  name: string;
  /** § nova etapa: identidade visual da competição — distinto do troféu, que só aparece nas telas de título. */
  logoUrl?: string | null;
}

export interface PlayerStatsRow {
  id: string;
  competition: CompetitionOption;
  appearances: number;
  goals: number;
  assists: number;
}

const NEW_COMPETITION = "__new__";

/**
 * §1/§6 etapa 3: estatísticas do jogador nesta temporada, separadas por
 * competição, com um TOTAL sempre calculado (nunca digitado — §2). Só
 * renderizado quando o dialog sabe seasonId+squadPlayerId (ou seja,
 * sempre que aberto a partir do elenco de uma temporada).
 */
export function PlayerStatsSection({
  seasonId,
  squadPlayerId,
}: {
  seasonId: string;
  squadPlayerId: string;
}) {
  const [stats, setStats] = useState<PlayerStatsRow[] | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/stats`)
      .then((res) => (res.ok ? res.json() : { stats: [] }))
      .then((data) => {
        if (!cancelled) setStats(data.stats ?? []);
      })
      .catch(() => {
        if (!cancelled) setStats([]);
      });
    return () => {
      cancelled = true;
    };
  }, [seasonId, squadPlayerId]);

  function patchLocal(statsId: string, patch: Partial<Pick<PlayerStatsRow, "appearances" | "goals" | "assists">>) {
    setStats((prev) => prev?.map((s) => (s.id === statsId ? { ...s, ...patch } : s)) ?? null);
  }

  function saveField(statsId: string, field: "appearances" | "goals" | "assists", value: number) {
    patchLocal(statsId, { [field]: value });
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/stats/${statsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).then((res) => {
      if (!res.ok) toast.error("Não foi possível salvar a estatística.");
    });
  }

  function handleRemove(statsId: string) {
    setStats((prev) => prev?.filter((s) => s.id !== statsId) ?? null);
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/stats/${statsId}`, { method: "DELETE" }).then(
      (res) => {
        if (!res.ok) toast.error("Não foi possível remover a estatística.");
      },
    );
  }

  if (stats === null) {
    return <Skeleton className="h-20 w-full" />;
  }

  const total = stats.reduce(
    (acc, s) => ({
      appearances: acc.appearances + s.appearances,
      goals: acc.goals + s.goals,
      assists: acc.assists + s.assists,
    }),
    { appearances: 0, goals: 0, assists: 0 },
  );

  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <h3 className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <ChartNoAxesColumnIcon className="size-3.5" />
          Estatísticas por competição
        </h3>
        {!adding && (
          <Button size="xs" variant="outline" onClick={() => setAdding(true)}>
            + Adicionar
          </Button>
        )}
      </div>

      {stats.length === 0 && !adding ? (
        <p className="text-muted-foreground text-xs">Nenhuma estatística registrada nesta temporada.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {stats.length > 0 && (
            <div className="text-muted-foreground grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem_1.25rem] gap-1 px-1 text-[10px] font-semibold tracking-wide uppercase">
              <span>Competição</span>
              <span className="text-center">Jogos</span>
              <span className="text-center">Gols</span>
              <span className="text-center">Assist.</span>
              <span />
            </div>
          )}
          {stats.map((s) => (
            <StatsRow key={s.id} row={s} onChange={saveField} onRemove={() => handleRemove(s.id)} />
          ))}
          {stats.length > 0 && (
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

      {adding && (
        <AddCompetitionStatsForm
          seasonId={seasonId}
          squadPlayerId={squadPlayerId}
          existingCompetitionIds={stats.map((s) => s.competition.id)}
          onAdded={(row) => {
            setStats((prev) => [...(prev ?? []), row]);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function StatsRow({
  row,
  onChange,
  onRemove,
}: {
  row: PlayerStatsRow;
  onChange: (statsId: string, field: "appearances" | "goals" | "assists", value: number) => void;
  onRemove: () => void;
}) {
  function handleInput(field: "appearances" | "goals" | "assists", raw: string) {
    const value = raw === "" ? 0 : Number(raw);
    if (Number.isNaN(value) || value < 0) return;
    onChange(row.id, field, value);
  }

  return (
    <div className="hover:bg-accent/30 group/stats-row grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem_1.25rem] items-center gap-1 rounded-md px-1 py-0.5">
      <span className="flex min-w-0 items-center gap-1.5 truncate text-sm">
        {row.competition.logoUrl ? (
          <Image
            src={row.competition.logoUrl}
            alt=""
            width={16}
            height={16}
            className="size-4 shrink-0 object-contain"
            unoptimized
          />
        ) : (
          <ShieldIcon className="text-muted-foreground size-4 shrink-0" strokeWidth={1.5} />
        )}
        <span className="truncate">{row.competition.name}</span>
      </span>
      <Input
        type="number"
        min={0}
        value={row.appearances}
        onChange={(e) => handleInput("appearances", e.target.value)}
        className="h-7 px-1 text-center text-xs"
      />
      <Input
        type="number"
        min={0}
        value={row.goals}
        onChange={(e) => handleInput("goals", e.target.value)}
        className="h-7 px-1 text-center text-xs"
      />
      <Input
        type="number"
        min={0}
        value={row.assists}
        onChange={(e) => handleInput("assists", e.target.value)}
        className="h-7 px-1 text-center text-xs"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover estatísticas de ${row.competition.name}`}
        className="text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 transition-opacity group-hover/stats-row:opacity-100"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}

function AddCompetitionStatsForm({
  seasonId,
  squadPlayerId,
  existingCompetitionIds,
  onAdded,
  onCancel,
}: {
  seasonId: string;
  squadPlayerId: string;
  existingCompetitionIds: string[];
  onAdded: (row: PlayerStatsRow) => void;
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
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/stats`, {
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
          placeholder="Ex: Campeonato Paranaense"
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
