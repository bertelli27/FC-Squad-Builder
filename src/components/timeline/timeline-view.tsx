"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PlusIcon, PencilIcon, SparklesIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { sortTimelineEvents, timelineEventTypeLabel, timelineEventTypeIcon, type TimelineEventVM } from "@/lib/timeline";
import { TimelineEventDialog, type TimelineEntityType } from "./timeline-event-dialog";

const ALL_FILTER = "__all__";

/**
 * Etapa 10.4 (§9/§16/§17) — narrativa histórica vertical de uma entidade,
 * misturando eventos automáticos (derivados de dados já existentes) e
 * manuais (cadastrados aqui). Reaproveita Card/Badge/EmptyState/Button do
 * design system existente, nenhuma versão paralela.
 */
export function TimelineView({
  events: initialEvents,
  entityType,
  entityId,
}: {
  events: TimelineEventVM[];
  entityType: TimelineEntityType;
  entityId: string;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [filter, setFilter] = useState(ALL_FILTER);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEventVM | null>(null);

  // §26 — filtro simples, só os tipos que realmente aparecem (nunca uma
  // categoria vazia), sem query nova: é um array filter sobre o que já
  // veio da página.
  const availableTypes = useMemo(() => {
    const seen = new Map<string, number>();
    for (const e of events) seen.set(e.type, (seen.get(e.type) ?? 0) + 1);
    return [...seen.entries()];
  }, [events]);

  const filtered = filter === ALL_FILTER ? events : events.filter((e) => e.type === filter);

  const yearGroups = useMemo(() => {
    const groups: { year: number; events: TimelineEventVM[] }[] = [];
    for (const e of filtered) {
      const last = groups[groups.length - 1];
      if (last && last.year === e.year) last.events.push(e);
      else groups.push({ year: e.year, events: [e] });
    }
    return groups;
  }, [filtered]);

  function openCreate() {
    setEditingEvent(null);
    setDialogOpen(true);
  }

  function openEdit(event: TimelineEventVM) {
    setEditingEvent(event);
    setDialogOpen(true);
  }

  function handleSaved(saved: TimelineEventVM) {
    setEvents((prev) => sortTimelineEvents(prev.some((e) => e.id === saved.id) ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved]));
  }

  function handleDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="Todos" active={filter === ALL_FILTER} onClick={() => setFilter(ALL_FILTER)} />
          {availableTypes.map(([type, count]) => (
            <FilterChip
              key={type}
              label={`${timelineEventTypeLabel(type)} (${count})`}
              active={filter === type}
              onClick={() => setFilter(type)}
            />
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Adicionar evento
        </Button>
      </div>

      {yearGroups.length === 0 ? (
        <EmptyState label="Nenhum acontecimento registrado ainda." />
      ) : (
        <div className="flex flex-col">
          {yearGroups.map(({ year, events: evts }, i) => (
            <div key={year} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="bg-primary text-primary-foreground flex h-8 w-16 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                  {year}
                </div>
                {i < yearGroups.length - 1 && <div className="bg-border my-1 w-px flex-1" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 pb-6">
                {evts.map((event) => (
                  <EventCard key={event.id} event={event} onEdit={() => openEdit(event)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <TimelineEventDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          entityType={entityType}
          entityId={entityId}
          event={editingEvent}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}

function EventCard({ event, onEdit }: { event: TimelineEventVM; onEdit: () => void }) {
  const Icon = timelineEventTypeIcon(event.type);
  const dateLabel = event.month
    ? [event.day ? String(event.day).padStart(2, "0") : null, String(event.month).padStart(2, "0")].filter(Boolean).join("/")
    : null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3",
        event.highlight && "border-primary/40 bg-primary/5",
      )}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- não é um componente novo por render: `Icon` vem de um Map fixo de ícones (src/lib/timeline.ts), só a leitura é dinâmica. */}
      <Icon className={cn("mt-0.5 size-4 shrink-0", event.highlight ? "text-primary" : "text-muted-foreground")} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold">{event.title}</span>
          {event.highlight && <SparklesIcon className="text-primary size-3.5 shrink-0" />}
          {dateLabel && <span className="text-muted-foreground text-xs">{dateLabel}</span>}
          <Badge variant="outline" className="text-[10px]">
            {timelineEventTypeLabel(event.type)}
          </Badge>
        </div>
        {event.description && <p className="text-muted-foreground mt-1 text-sm">{event.description}</p>}
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            alt=""
            width={160}
            height={90}
            unoptimized
            className="mt-2 max-w-full rounded-md object-cover"
          />
        )}
        {event.editHref && (
          <Link
            href={event.editHref}
            className="text-primary mt-1.5 flex w-fit items-center gap-1 text-xs underline-offset-2 hover:underline"
          >
            <ExternalLinkIcon className="size-3" />
            Ver origem
          </Link>
        )}
      </div>
      {event.isManual && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${event.title}`}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <PencilIcon className="size-3.5" />
        </button>
      )}
    </div>
  );
}
