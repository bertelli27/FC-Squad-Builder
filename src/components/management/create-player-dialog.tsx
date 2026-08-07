"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { PlusIcon, UserRoundPlus, XIcon, ShieldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { CountrySelect } from "@/components/ui/country-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SquadPicker, type SquadOption } from "./squad-picker";
import { POSITIONS, MAX_SECONDARY_POSITIONS } from "@/lib/positions";
import type { EditablePlayer } from "@/components/player-card/edit-player-form";

/**
 * Etapa 9 (§4-9) — cria um jogador direto pelo Gerenciamento, sem exigir
 * clube/temporada: mesmos campos cadastrais de EditPlayerForm (o jogador
 * criado aqui é o mesmo CachedPlayer central de sempre, editável depois
 * pelo mesmo formulário), só que POST em vez de PATCH e sem nada de
 * elenco/número de camisa/destino.
 */
export function CreatePlayerDialog({ onCreated }: { onCreated: (player: EditablePlayer) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [secondaryPositions, setSecondaryPositions] = useState<string[]>([]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [nationality, setNationality] = useState("");
  const [overall, setOverall] = useState("");
  const [potential, setPotential] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [externalLink, setExternalLink] = useState("");
  const [currentClub, setCurrentClub] = useState<SquadOption | null>(null);
  const [saving, setSaving] = useState(false);

  const usedPositions = new Set([position, ...secondaryPositions].filter(Boolean));

  function reset() {
    setName("");
    setPosition("");
    setSecondaryPositions([]);
    setDateOfBirth("");
    setNationality("");
    setOverall("");
    setPotential("");
    setPhotoUrl("");
    setExternalLink("");
    setCurrentClub(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome ao jogador.");
      return;
    }
    if (!position) {
      toast.error("Escolha uma posição.");
      return;
    }

    setSaving(true);
    fetch("/api/players/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        position,
        secondaryPositions: secondaryPositions.filter(Boolean),
        dateOfBirth: dateOfBirth || undefined,
        nationality: nationality || undefined,
        overall: overall ? Number(overall) : undefined,
        potential: potential ? Number(potential) : undefined,
        photoUrl: photoUrl || undefined,
        externalLink: externalLink || undefined,
        currentClubId: currentClub?.id || undefined,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onCreated({
          cachedPlayerId: data.player.id,
          source: data.player.source,
          name: data.player.name,
          photoUrl: data.player.photoUrl,
          dateOfBirth: data.player.dateOfBirth,
          nationality: data.player.nationality,
          position: data.player.position,
          secondaryPositions: data.player.secondaryPositions,
          overall: data.player.overall,
          potential: data.player.potential,
          externalLink: data.player.externalLink,
        });
        toast.success(`${name} criado.`);
        reset();
        setOpen(false);
      })
      .catch(() => toast.error("Não foi possível criar o jogador."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        Criar jogador
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <UserRoundPlus className="size-4" />
            Criar jogador
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Não precisa vincular a um clube agora — o jogador fica disponível pra ser adicionado a um elenco depois.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-player-name">Nome</Label>
            <Input id="create-player-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-player-position">Posição principal</Label>
            <Select value={position} onValueChange={(v) => setPosition(v ?? "")}>
              <SelectTrigger id="create-player-position">
                <SelectValue placeholder="Selecione">
                  {(v: string) => POSITIONS.find((p) => p.value === v)?.label ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Posições secundárias</Label>
              {secondaryPositions.length < MAX_SECONDARY_POSITIONS && (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => setSecondaryPositions((prev) => [...prev, ""])}
                >
                  <PlusIcon className="size-3" />
                  Adicionar
                </Button>
              )}
            </div>
            {secondaryPositions.map((secondary, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <Select
                  value={secondary}
                  onValueChange={(v) =>
                    setSecondaryPositions((prev) => prev.map((p, i) => (i === index ? (v ?? "") : p)))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione">
                      {(v: string) => POSITIONS.find((p) => p.value === v)?.label ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.filter((p) => p.value === secondary || !usedPositions.has(p.value)).map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setSecondaryPositions((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Remover posição secundária"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-player-dob">Data de nascimento</Label>
            <Input
              id="create-player-dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-player-nationality">Nacionalidade</Label>
            <CountrySelect id="create-player-nationality" value={nationality} onChange={setNationality} />
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="create-player-overall">Overall</Label>
              <Input
                id="create-player-overall"
                type="number"
                min={1}
                max={99}
                value={overall}
                onChange={(e) => setOverall(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="create-player-potential">Potencial</Label>
              <Input
                id="create-player-potential"
                type="number"
                min={1}
                max={99}
                value={potential}
                onChange={(e) => setPotential(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-player-photo">Foto</Label>
            <ImageUrlInput id="create-player-photo" value={photoUrl} onChange={setPhotoUrl} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Clube atual (opcional)</Label>
            {currentClub ? (
              <div className="bg-muted/40 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm">
                {currentClub.logoUrl ? (
                  <Image src={currentClub.logoUrl} alt="" width={20} height={20} className="size-5 object-contain" unoptimized />
                ) : (
                  <ShieldIcon className="text-muted-foreground size-5" />
                )}
                <span className="flex-1 truncate">{currentClub.name}</span>
                <button
                  type="button"
                  onClick={() => setCurrentClub(null)}
                  aria-label="Remover clube atual"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ) : (
              <SquadPicker onSelect={setCurrentClub} />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-player-link">Link externo (ogol, transfermarket...)</Label>
            <Input
              id="create-player-link"
              type="url"
              placeholder="https://..."
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
            />
          </div>

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Criando…" : "Criar jogador"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
