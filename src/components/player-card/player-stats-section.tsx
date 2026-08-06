"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { XIcon, ChartNoAxesColumnIcon, ShieldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
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

type StatField = "appearances" | "goals" | "assists";

/**
 * Uma linha combinada — ou uma PlayerCompetitionStats real (`statsId`
 * preenchido), ou uma competição declarada na temporada (§1.2 etapa 9-4,
 * SeasonCompetition) que este jogador ainda não tem estatística nenhuma
 * pra ela (`statsId: null`). Chave estável por `competitionId` (nunca por
 * `statsId`, que só passa a existir depois do primeiro valor digitado) é
 * o que faz React NÃO desmontar o campo no meio da digitação quando a
 * linha vira real.
 */
interface MergedRow {
  competitionId: string;
  competition: CompetitionOption;
  statsId: string | null;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
}

const NEW_COMPETITION = "__new__";

/**
 * §1/§6 etapa 3, §1-§2 etapa 9-4: estatísticas do jogador nesta temporada,
 * separadas por competição, com um TOTAL sempre calculado (nunca digitado
 * — §2 etapa 3). Toda competição já declarada na temporada (§1.2 etapa
 * 9-4, SeasonCompetition) aparece automaticamente aqui como uma linha
 * vazia — não é mais preciso adicionar a competição jogador por jogador; o
 * "+ Adicionar" continua existindo só como escape hatch pra uma
 * competição pontual que não faz parte da lista da temporada. Só
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
  const [seasonCompetitions, setSeasonCompetitions] = useState<CompetitionOption[] | null>(null);
  const [adding, setAdding] = useState(false);
  // Valores digitados numa linha que ainda não existe no banco (§1.3) —
  // sempre a fonte de verdade pro que a UI mostra enquanto não existe
  // statsId, independente de qualquer request em andamento. Nunca
  // desabilita o campo nem descarta uma tecla digitada rápido demais.
  const [drafts, setDrafts] = useState<Record<string, Partial<Record<StatField, number>>>>({});
  // Espelho síncrono de `drafts` — necessário porque o guard de "já tem
  // criação em voo" (inFlightCreatesRef) precisa ler o rascunho mais
  // recente e marcar o voo NO MESMO TICK síncrono em que decide disparar
  // o POST. Ler/escrever via o updater de setDrafts não serve pra isso:
  // React pode adiar/batchar quando esse updater realmente roda, então
  // duas teclas digitadas em sequência rápida (ex: "1" seguido de "0" de
  // "10") podiam passar pelo guard ANTES de qualquer uma delas marcar o
  // voo, disparando duas criações concorrentes pra mesma competição.
  const draftsRef = useRef<Record<string, Partial<Record<StatField, number>>>>({});
  const inFlightCreatesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/stats`).then((res) =>
        res.ok ? res.json() : { stats: [] },
      ),
      fetch(`/api/seasons/${seasonId}/competitions`).then((res) => (res.ok ? res.json() : { competitions: [] })),
    ])
      .then(([statsData, seasonCompsData]) => {
        if (cancelled) return;
        setStats(statsData.stats ?? []);
        setSeasonCompetitions((seasonCompsData.competitions ?? []).map((sc: { competition: CompetitionOption }) => sc.competition));
      })
      .catch(() => {
        if (!cancelled) {
          setStats([]);
          setSeasonCompetitions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [seasonId, squadPlayerId]);

  function patchLocal(statsId: string, patch: Partial<Pick<PlayerStatsRow, "appearances" | "goals" | "assists">>) {
    setStats((prev) => prev?.map((s) => (s.id === statsId ? { ...s, ...patch } : s)) ?? null);
  }

  function saveField(statsId: string, field: StatField, value: number) {
    patchLocal(statsId, { [field]: value });
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/stats/${statsId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    }).then((res) => {
      if (!res.ok) toast.error("Não foi possível salvar a estatística.");
    });
  }

  /**
   * Digitar num campo de uma linha ainda sem statsId: atualiza o rascunho
   * na hora (nunca perde tecla) e tenta criar a linha real já com esse
   * valor. Se uma criação para a mesma competição já estiver em voo (ex:
   * o "0" de "10" digitado logo depois do "1"), essa tentativa não dispara
   * outra requisição — o rascunho mais novo fica só guardado, e a
   * resolução da que já está em voo reconcilia (envia o que sobrou via
   * PATCH, já com o statsId em mãos) assim que ela voltar. Isso evita
   * tanto criar a linha duas vezes quanto perder uma tecla digitada
   * enquanto a primeira criação ainda está a caminho.
   */
  function setDraft(competitionId: string, field: StatField, value: number | null) {
    const current = draftsRef.current[competitionId] ?? {};
    const next = { ...current };
    if (value === null) delete next[field];
    else next[field] = value;
    draftsRef.current = { ...draftsRef.current, [competitionId]: next };
    setDrafts(draftsRef.current);
  }

  function clearDraftKeys(competitionId: string, keys: StatField[]) {
    const current = draftsRef.current[competitionId];
    if (!current) return;
    const remaining = { ...current };
    for (const key of keys) delete remaining[key];
    const rest = { ...draftsRef.current };
    if (Object.keys(remaining).length === 0) delete rest[competitionId];
    else rest[competitionId] = remaining;
    draftsRef.current = rest;
    setDrafts(rest);
  }

  function handleDraftChange(competitionId: string, field: StatField, value: number | null) {
    setDraft(competitionId, field, value);
    attemptCreate(competitionId);
  }

  function attemptCreate(competitionId: string) {
    if (inFlightCreatesRef.current.has(competitionId)) return; // resolução em voo já vai reconciliar o rascunho mais novo
    const draft = draftsRef.current[competitionId];
    if (!draft || Object.keys(draft).length === 0) return;

    const snapshot = { ...draft };
    inFlightCreatesRef.current.add(competitionId);
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitionId, ...snapshot }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setStats((s) => [...(s ?? []), data.stats]);
        // Só remove do rascunho o que foi realmente enviado nesta
        // requisição — qualquer valor mais novo (editado enquanto ela
        // estava em voo) sobrevive e é aplicado a seguir via PATCH, já
        // com o statsId em mãos.
        const current = draftsRef.current[competitionId];
        const changedKeys = (Object.keys(snapshot) as StatField[]).filter((key) => current?.[key] === snapshot[key]);
        const remaining = current
          ? (Object.fromEntries(Object.entries(current).filter(([key]) => !changedKeys.includes(key as StatField))) as Partial<
              Record<StatField, number>
            >)
          : {};
        clearDraftKeys(competitionId, changedKeys);
        for (const [field, value] of Object.entries(remaining) as [StatField, number][]) {
          saveField(data.stats.id, field, value);
        }
      })
      .catch(() => toast.error("Não foi possível salvar a estatística."))
      .finally(() => inFlightCreatesRef.current.delete(competitionId));
  }

  function handleRowChange(row: MergedRow, field: StatField, value: number | null) {
    if (row.statsId) {
      saveField(row.statsId, field, value ?? 0);
    } else {
      handleDraftChange(row.competitionId, field, value);
    }
  }

  function handleRemove(statsId: string) {
    setStats((prev) => prev?.filter((s) => s.id !== statsId) ?? null);
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}/stats/${statsId}`, { method: "DELETE" }).then(
      (res) => {
        if (!res.ok) toast.error("Não foi possível remover a estatística.");
      },
    );
  }

  if (stats === null || seasonCompetitions === null) {
    return <Skeleton className="h-20 w-full" />;
  }

  const realByCompetitionId = new Map(stats.map((s) => [s.competition.id, s]));

  function buildRow(c: CompetitionOption): MergedRow {
    const real = realByCompetitionId.get(c.id);
    if (real) {
      return { competitionId: c.id, competition: c, statsId: real.id, appearances: real.appearances, goals: real.goals, assists: real.assists };
    }
    const draft = drafts[c.id];
    return {
      competitionId: c.id,
      competition: c,
      statsId: null,
      appearances: draft?.appearances ?? null,
      goals: draft?.goals ?? null,
      assists: draft?.assists ?? null,
    };
  }

  // Ordem estável: primeiro as competições da temporada (na ordem que ela
  // as lista), depois qualquer estatística real de uma competição que não
  // esteja mais na lista da temporada (nunca escondida — §1.2/service).
  const rows: MergedRow[] = [
    ...seasonCompetitions.map(buildRow),
    ...stats
      .filter((s) => !seasonCompetitions.some((c) => c.id === s.competition.id))
      .map(
        (s): MergedRow => ({
          competitionId: s.competition.id,
          competition: s.competition,
          statsId: s.id,
          appearances: s.appearances,
          goals: s.goals,
          assists: s.assists,
        }),
      ),
  ];

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

      {rows.length === 0 && !adding ? (
        <p className="text-muted-foreground text-xs">
          Nenhuma competição definida para esta temporada ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {rows.length > 0 && (
            <div className="text-muted-foreground grid grid-cols-[1fr_2.5rem_2.5rem_2.5rem_1.25rem] gap-1 px-1 text-[10px] font-semibold tracking-wide uppercase">
              <span>Competição</span>
              <span className="text-center">Jogos</span>
              <span className="text-center">Gols</span>
              <span className="text-center">Assist.</span>
              <span />
            </div>
          )}
          {rows.map((row) => (
            <StatsRow
              key={row.competitionId}
              row={row}
              onChange={(field, value) => handleRowChange(row, field, value)}
              onRemove={row.statsId ? () => handleRemove(row.statsId!) : undefined}
            />
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
          existingCompetitionIds={rows.map((r) => r.competitionId)}
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
  row: MergedRow;
  onChange: (field: StatField, value: number | null) => void;
  onRemove?: () => void;
}) {
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
      <NumberField
        min={0}
        value={row.appearances}
        onChange={(v) => onChange("appearances", v)}
        aria-label={`Jogos em ${row.competition.name}`}
        className="h-7 px-1 text-center text-xs"
      />
      <NumberField
        min={0}
        value={row.goals}
        onChange={(v) => onChange("goals", v)}
        aria-label={`Gols em ${row.competition.name}`}
        className="h-7 px-1 text-center text-xs"
      />
      <NumberField
        min={0}
        value={row.assists}
        onChange={(v) => onChange("assists", v)}
        aria-label={`Assistências em ${row.competition.name}`}
        className="h-7 px-1 text-center text-xs"
      />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remover estatísticas de ${row.competition.name}`}
          className="text-muted-foreground hover:text-destructive flex items-center justify-center opacity-0 transition-opacity group-hover/stats-row:opacity-100"
        >
          <XIcon className="size-3.5" />
        </button>
      ) : (
        <span />
      )}
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
