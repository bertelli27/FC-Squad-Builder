"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { TIMELINE_EVENT_TYPES } from "@/lib/timeline";
import type { TimelineEventVM } from "@/lib/timeline";

export type TimelineEntityType = "squad" | "cachedPlayer" | "competition";

const ENTITY_ID_FIELD: Record<TimelineEntityType, string> = {
  squad: "squadId",
  cachedPlayer: "cachedPlayerId",
  competition: "competitionId",
};

/**
 * Etapa 10.4 (§13/§14) — criar/editar um evento MANUAL da Timeline. Só é
 * montado pra eventos manuais (o pai — TimelineView — nunca abre isto
 * pra um evento automático, que não tem id de banco pra editar).
 */
export function TimelineEventDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  event,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: TimelineEntityType;
  entityId: string;
  /** null/undefined = criar; presente = editar este evento manual. */
  event?: TimelineEventVM | null;
  onSaved: (event: TimelineEventVM) => void;
  onDeleted?: (id: string) => void;
}) {
  const [type, setType] = useState(event?.type ?? "history");
  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [year, setYear] = useState(event?.year != null ? String(event.year) : "");
  const [month, setMonth] = useState(event?.month != null ? String(event.month) : "");
  const [day, setDay] = useState(event?.day != null ? String(event.day) : "");
  const [highlight, setHighlight] = useState(event?.highlight ?? false);
  const [imageUrl, setImageUrl] = useState(event?.imageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!title.trim()) {
      toast.error("Dê um título ao evento.");
      return;
    }
    if (!year.trim() || !Number.isInteger(Number(year))) {
      toast.error("Informe o ano.");
      return;
    }

    const body = {
      ...(event ? {} : { [ENTITY_ID_FIELD[entityType]]: entityId }),
      type,
      title,
      description: description || null,
      year: Number(year),
      month: month ? Number(month) : null,
      day: day ? Number(day) : null,
      highlight,
      imageUrl: imageUrl || null,
    };

    setSaving(true);
    fetch(event ? `/api/timeline-events/${event.id}` : "/api/timeline-events", {
      method: event ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        const row = data.event;
        onSaved({
          id: row.id,
          type: row.type,
          title: row.title,
          description: row.description,
          year: row.year,
          month: row.month,
          day: row.day,
          order: row.order,
          isManual: true,
          highlight: row.highlight,
          imageUrl: row.imageUrl,
          sourceType: null,
          sourceId: null,
        });
        toast.success(event ? "Evento atualizado." : "Evento adicionado.");
        onOpenChange(false);
      })
      .catch(() => toast.error("Não foi possível salvar o evento."))
      .finally(() => setSaving(false));
  }

  async function handleDelete() {
    if (!event) return;
    const ok = await confirm({
      title: `Excluir "${event.title}"?`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    const res = await fetch(`/api/timeline-events/${event.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Não foi possível excluir o evento.");
      return;
    }
    onDeleted?.(event.id);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{event ? "Editar evento" : "Adicionar evento histórico"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timeline-event-title">Título</Label>
              <Input id="timeline-event-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timeline-event-category">Categoria</Label>
              <Select value={type} onValueChange={(v) => v && setType(v)}>
                <SelectTrigger id="timeline-event-category">
                  <SelectValue>{(v: string) => TIMELINE_EVENT_TYPES.find((t) => t.value === v)?.label ?? v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIMELINE_EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timeline-event-year">Ano</Label>
                <Input id="timeline-event-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timeline-event-month">Mês</Label>
                <Input id="timeline-event-month" type="number" min={1} max={12} value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timeline-event-day">Dia</Label>
                <Input id="timeline-event-day" type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timeline-event-description">Descrição (opcional)</Label>
              <Textarea id="timeline-event-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timeline-event-image">Imagem (opcional)</Label>
              <ImageUrlInput id="timeline-event-image" value={imageUrl} onChange={setImageUrl} />
            </div>

            <label className="flex w-fit items-center gap-2 text-sm">
              <Checkbox checked={highlight} onCheckedChange={(v) => setHighlight(!!v)} aria-label="Destaque" />
              Marcar como destaque
            </label>

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancelar
                </Button>
              </div>
              {event && (
                <Button type="button" variant="ghost" disabled={deleting} onClick={handleDelete} className="text-destructive">
                  <Trash2Icon className="size-4" />
                  Excluir
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
