"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import {
  CalendarPlus,
  ArrowRightLeftIcon,
  TrophyIcon,
  XIcon,
  ShieldIcon,
} from "lucide-react";
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
import { formatSeasonLabel, formatMoney } from "@/lib/season";
import { cn } from "@/lib/utils";
import { AddStintDialog } from "./add-stint-dialog";
import { AddCareerTitleDialog } from "./add-career-title-dialog";
import { AddCareerTransferDialog } from "./add-career-transfer-dialog";

export interface CareerTitleVM {
  id: string;
  competition: { id: string; name: string; trophyImageUrl: string | null };
}

export interface CareerStintVM {
  id: string;
  seasonId: string | null;
  clubName: string;
  clubLogoUrl: string | null;
  startYear: number;
  calendar: string;
  appearances: number;
  goals: number;
  assists: number;
  summary: string | null;
  order: number;
  titles: CareerTitleVM[];
}

export interface CareerTransferVM {
  id: string;
  fromClubName: string | null;
  toClubName: string;
  value: number | null;
  year: number;
  order: number;
}

const ALL_CLUBS = "__all__";

export function CareerTimeline({
  careerId,
  initialStints,
  initialTransfers,
}: {
  careerId: string;
  initialStints: CareerStintVM[];
  initialTransfers: CareerTransferVM[];
}) {
  const [stints, setStints] = useState(initialStints);
  const [transfers, setTransfers] = useState(initialTransfers);
  const [filter, setFilter] = useState(ALL_CLUBS);
  const [addStintOpen, setAddStintOpen] = useState(false);
  const [addTransferOpen, setAddTransferOpen] = useState(false);

  const clubs = useMemo(() => [...new Set(stints.map((s) => s.clubName))], [stints]);

  const filteredStints = filter === ALL_CLUBS ? stints : stints.filter((s) => s.clubName === filter);

  const totals = useMemo(
    () =>
      filteredStints.reduce(
        (acc, s) => ({
          appearances: acc.appearances + s.appearances,
          goals: acc.goals + s.goals,
          assists: acc.assists + s.assists,
        }),
        { appearances: 0, goals: 0, assists: 0 },
      ),
    [filteredStints],
  );

  const titleCounts = useMemo(() => {
    const byCompetition = new Map<string, { competition: CareerTitleVM["competition"]; count: number }>();
    for (const stint of filteredStints) {
      for (const title of stint.titles) {
        const entry = byCompetition.get(title.competition.id);
        if (entry) entry.count += 1;
        else byCompetition.set(title.competition.id, { competition: title.competition, count: 1 });
      }
    }
    return [...byCompetition.values()].sort((a, b) => b.count - a.count);
  }, [filteredStints]);

  // Interleaved chronological timeline (stints + transfers) only makes
  // sense in "toda a carreira" — filtering to one club shows just that
  // club's own stints in sequence, without transfer noise from other
  // clubs (§12: filtragem recalcula os dados, não só esconde visualmente).
  type TimelineItem = { kind: "stint"; order: number; stint: CareerStintVM } | { kind: "transfer"; order: number; transfer: CareerTransferVM };
  const timelineItems: TimelineItem[] =
    filter === ALL_CLUBS
      ? [
          ...stints.map((stint): TimelineItem => ({ kind: "stint", order: stint.order, stint })),
          ...transfers.map((transfer): TimelineItem => ({ kind: "transfer", order: transfer.order, transfer })),
        ].sort((a, b) => a.order - b.order)
      : filteredStints
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((stint): TimelineItem => ({ kind: "stint", order: stint.order, stint }));

  function updateStintLocal(stintId: string, patch: Partial<CareerStintVM>) {
    setStints((prev) => prev.map((s) => (s.id === stintId ? { ...s, ...patch } : s)));
  }

  async function handleRemoveStint(stint: CareerStintVM, confirm: ReturnType<typeof useConfirmDialog>["confirm"]) {
    const ok = await confirm({
      title: `Remover a passagem por ${stint.clubName} (${formatSeasonLabel(stint.startYear, stint.calendar)})?`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;

    setStints((prev) => prev.filter((s) => s.id !== stint.id));
    const res = await fetch(`/api/careers/${careerId}/stints/${stint.id}`, { method: "DELETE" });
    if (!res.ok) {
      setStints((prev) => [...prev, stint]);
      toast.error("Não foi possível remover a passagem.");
    }
  }

  async function handleRemoveTransfer(
    transfer: CareerTransferVM,
    confirm: ReturnType<typeof useConfirmDialog>["confirm"],
  ) {
    const ok = await confirm({
      title: `Remover a transferência para ${transfer.toClubName}?`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;

    setTransfers((prev) => prev.filter((t) => t.id !== transfer.id));
    const res = await fetch(`/api/careers/${careerId}/transfers/${transfer.id}`, { method: "DELETE" });
    if (!res.ok) {
      setTransfers((prev) => [...prev, transfer]);
      toast.error("Não foi possível remover a transferência.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
          <SelectTrigger className="w-52">
            <SelectValue>{(v: string) => (v === ALL_CLUBS ? "Toda a carreira" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CLUBS}>Toda a carreira</SelectItem>
            {clubs.map((club) => (
              <SelectItem key={club} value={club}>
                {club}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddTransferOpen(true)}>
            <ArrowRightLeftIcon className="size-4" />
            Transferência
          </Button>
          <Button size="sm" onClick={() => setAddStintOpen(true)}>
            <CalendarPlus className="size-4" />
            Nova passagem
          </Button>
        </div>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3 [.border-b]:pb-3">
          <CardTitle className="text-base">
            {filter === ALL_CLUBS ? "Visão geral da carreira" : `Visão geral — ${filter}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="flex flex-wrap gap-6">
            <Stat label="Jogos" value={totals.appearances} />
            <Stat label="Gols" value={totals.goals} />
            <Stat label="Assistências" value={totals.assists} />
            <Stat label="Clubes" value={filter === ALL_CLUBS ? clubs.length : 1} />
            <Stat label="Temporadas" value={filteredStints.length} />
          </div>

          {titleCounts.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t pt-3">
              <h3 className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                <TrophyIcon className="size-3.5" />
                Títulos
              </h3>
              <ul className="flex flex-wrap gap-3">
                {titleCounts.map(({ competition, count }) => (
                  <li key={competition.id} className="bg-muted/40 flex items-center gap-2 rounded-lg border px-2 py-1.5">
                    {competition.trophyImageUrl ? (
                      <Image
                        src={competition.trophyImageUrl}
                        alt={competition.name}
                        width={24}
                        height={24}
                        className="size-6 object-contain"
                        unoptimized
                      />
                    ) : (
                      <TrophyIcon className="text-muted-foreground size-6" strokeWidth={1.25} />
                    )}
                    <span className="text-sm font-medium">
                      {competition.name} <span className="text-muted-foreground">×{count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {timelineItems.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">
            Nenhuma passagem registrada ainda.
          </p>
        ) : (
          timelineItems.map((item) =>
            item.kind === "stint" ? (
              <StintCard
                key={item.stint.id}
                careerId={careerId}
                stint={item.stint}
                onUpdated={(patch) => updateStintLocal(item.stint.id, patch)}
                onTitleAdded={(title) =>
                  updateStintLocal(item.stint.id, { titles: [...item.stint.titles, title] })
                }
                onTitleRemoved={(titleId) =>
                  updateStintLocal(item.stint.id, {
                    titles: item.stint.titles.filter((t) => t.id !== titleId),
                  })
                }
                onRemove={handleRemoveStint}
              />
            ) : (
              <TransferConnector
                key={item.transfer.id}
                transfer={item.transfer}
                onRemove={handleRemoveTransfer}
              />
            ),
          )
        )}
      </div>

      <AddStintDialog
        careerId={careerId}
        open={addStintOpen}
        onOpenChange={setAddStintOpen}
        onAdded={(stint) => setStints((prev) => [...prev, { ...stint, titles: stint.titles ?? [] }])}
      />
      <AddCareerTransferDialog
        careerId={careerId}
        open={addTransferOpen}
        onOpenChange={setAddTransferOpen}
        onAdded={(transfer) => setTransfers((prev) => [...prev, transfer])}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-heading text-2xl font-bold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function TransferConnector({
  transfer,
  onRemove,
}: {
  transfer: CareerTransferVM;
  onRemove: (transfer: CareerTransferVM, confirm: ReturnType<typeof useConfirmDialog>["confirm"]) => void;
}) {
  const { confirm, dialog } = useConfirmDialog();
  return (
    <>
      <div className="group/transfer flex items-center gap-3 px-2">
        <div className="bg-border h-8 w-px shrink-0 self-center" />
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
          <ArrowRightLeftIcon className="text-primary size-4 shrink-0" />
          <span className="font-heading text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Transferência
          </span>
          <span className="min-w-0 flex-1 truncate">
            {transfer.fromClubName ? `${transfer.fromClubName} → ` : ""}
            {transfer.toClubName}
            <span className="text-muted-foreground"> · {transfer.year}</span>
          </span>
          {transfer.value != null && <span className="shrink-0 font-medium">{formatMoney(transfer.value)}</span>}
          <button
            type="button"
            onClick={() => onRemove(transfer, confirm)}
            aria-label="Remover transferência"
            className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover/transfer:opacity-100"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>
      {dialog}
    </>
  );
}

function StintCard({
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

function NumberField({
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
