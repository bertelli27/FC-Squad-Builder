"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SEASON_CALENDARS, formatSeasonLabel } from "@/lib/season";
import type { CareerStintVM } from "./career-timeline";

interface SquadOption {
  id: string;
  name: string;
  seasonCalendar: string;
}

interface SeasonOption {
  id: string;
  startYear: number;
}

/**
 * §5/§6: linking to an existing club/season reuses its identity instead of
 * retyping it (and never copies its roster — see schema.prisma's comment
 * on CareerStint); "Manual" stays available for a club never modeled in
 * the Clubes module at all.
 */
export function AddStintDialog({
  careerId,
  open,
  onOpenChange,
  onAdded,
}: {
  careerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (stint: CareerStintVM) => void;
}) {
  const [mode, setMode] = useState<"existing" | "manual">("existing");
  const [squads, setSquads] = useState<SquadOption[]>([]);
  const [squadId, setSquadId] = useState("");
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [seasonId, setSeasonId] = useState("");

  const [clubName, setClubName] = useState("");
  const [clubLogoUrl, setClubLogoUrl] = useState("");
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [calendar, setCalendar] = useState("brasileiro");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/squads")
      .then((res) => (res.ok ? res.json() : { squads: [] }))
      .then((data) => setSquads(data.squads ?? []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!squadId) return;
    fetch(`/api/squads/${squadId}/seasons`)
      .then((res) => (res.ok ? res.json() : { seasons: [] }))
      .then((data) => setSeasons(data.seasons ?? []))
      .catch(() => {});
  }, [squadId]);

  function handleSquadChange(value: string) {
    setSquadId(value);
    setSeasons([]);
    setSeasonId("");
  }

  const selectedSquad = squads.find((s) => s.id === squadId);

  function reset() {
    setMode("existing");
    setSquadId("");
    setSeasonId("");
    setClubName("");
    setClubLogoUrl("");
    setStartYear(new Date().getFullYear());
    setCalendar("brasileiro");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const body =
      mode === "existing"
        ? seasonId
          ? { seasonId }
          : null
        : clubName.trim() && Number.isInteger(startYear)
          ? { clubName, clubLogoUrl: clubLogoUrl || undefined, startYear, calendar }
          : null;

    if (!body) {
      toast.error(mode === "existing" ? "Escolha um clube e uma temporada." : "Preencha o clube e o ano.");
      return;
    }

    setSaving(true);
    fetch(`/api/careers/${careerId}/stints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onAdded(data.stint);
        toast.success(`${data.stint.clubName} adicionado à carreira.`);
        reset();
        onOpenChange(false);
      })
      .catch(() => toast.error("Não foi possível adicionar a passagem."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <CalendarPlus className="size-4" />
            Nova passagem
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => v && setMode(v as "existing" | "manual")}>
          <TabsList>
            <TabsTrigger value="existing">Clube existente</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
        </Tabs>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "existing" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Clube</Label>
                <Select value={squadId} onValueChange={(v) => v && handleSquadChange(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione">
                      {(v: string) => squads.find((s) => s.id === v)?.name ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {squads.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {squadId && (
                <div className="flex flex-col gap-1.5">
                  <Label>Temporada</Label>
                  <Select value={seasonId} onValueChange={(v) => v && setSeasonId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione">
                        {(v: string) => {
                          const s = seasons.find((s) => s.id === v);
                          return s && selectedSquad
                            ? formatSeasonLabel(s.startYear, selectedSquad.seasonCalendar)
                            : v;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {seasons.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {formatSeasonLabel(s.startYear, selectedSquad?.seasonCalendar ?? "brasileiro")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {seasons.length === 0 && (
                    <p className="text-muted-foreground text-xs">Esse clube ainda não tem temporadas.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stint-club">Clube</Label>
                <Input id="stint-club" value={clubName} onChange={(e) => setClubName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stint-logo">URL do escudo (opcional)</Label>
                <ImageUrlInput id="stint-logo" value={clubLogoUrl} onChange={setClubLogoUrl} />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="stint-year">Ano</Label>
                  <Input
                    id="stint-year"
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label>Calendário</Label>
                  <Select value={calendar} onValueChange={(v) => v && setCalendar(v)}>
                    <SelectTrigger>
                      <SelectValue>
                        {(v: string) => SEASON_CALENDARS.find((c) => c.value === v)?.label ?? v}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SEASON_CALENDARS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-muted-foreground text-xs">
                Rótulo: {formatSeasonLabel(startYear, calendar)}
              </p>
            </>
          )}

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Adicionando…" : "Adicionar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
