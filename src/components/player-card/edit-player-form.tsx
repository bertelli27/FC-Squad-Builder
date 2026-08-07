"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { PlusIcon, XIcon, ShieldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { CountrySelect } from "@/components/ui/country-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SquadPicker, type SquadOption } from "@/components/management/squad-picker";
import { POSITIONS, MAX_SECONDARY_POSITIONS } from "@/lib/positions";

export interface EditablePlayer {
  cachedPlayerId: string;
  /** Nova etapa — só usado para restringir "Excluir jogador" a jogadores custom; o formulário de edição em si não depende disso. */
  source?: string | null;
  name: string;
  photoUrl?: string | null;
  dateOfBirth?: string | null; // ISO
  nationality?: string | null;
  position?: string | null;
  secondaryPositions?: string[];
  overall?: number | null;
  potential?: number | null;
  externalLink?: string | null;
}

/**
 * Shared cadastral editing form (§16/§27, etapa 6) — the same component
 * mounts from the squad/season player profile (player-profile-dialog.tsx)
 * and from the Carreira module's "Editar jogador" action, so there's one
 * form/flow to maintain instead of two.
 */
export function EditPlayerForm({
  player,
  onSaved,
  onCancel,
}: {
  player: EditablePlayer;
  onSaved: (patch: Partial<EditablePlayer>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [photoUrl, setPhotoUrl] = useState(player.photoUrl ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(player.dateOfBirth?.slice(0, 10) ?? "");
  const [nationality, setNationality] = useState(player.nationality ?? "");
  const [position, setPosition] = useState(player.position ?? "");
  const [secondaryPositions, setSecondaryPositions] = useState<string[]>(
    player.secondaryPositions ?? [],
  );
  const [overall, setOverall] = useState(player.overall != null ? String(player.overall) : "");
  const [potential, setPotential] = useState(player.potential != null ? String(player.potential) : "");
  const [externalLink, setExternalLink] = useState(player.externalLink ?? "");
  const [currentClub, setCurrentClub] = useState<SquadOption | null>(null);
  const [loadingCurrentClub, setLoadingCurrentClub] = useState(true);
  const [saving, setSaving] = useState(false);

  // Etapa 10.1 (§3) — buscado à parte (não vem em `player`) pra não ter
  // que colocar esse campo no DTO genérico que todo caller de
  // EditPlayerForm precisaria passar a montar.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/players/${player.cachedPlayerId}/current-club`)
      .then((res) => (res.ok ? res.json() : { currentClub: null }))
      .then((data) => {
        if (!cancelled) setCurrentClub(data.currentClub);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingCurrentClub(false);
      });
    return () => {
      cancelled = true;
    };
  }, [player.cachedPlayerId]);

  function addSecondaryPosition() {
    if (secondaryPositions.length >= MAX_SECONDARY_POSITIONS) return;
    setSecondaryPositions((prev) => [...prev, ""]);
  }

  function updateSecondaryPosition(index: number, value: string) {
    setSecondaryPositions((prev) => prev.map((p, i) => (i === index ? value : p)));
  }

  function removeSecondaryPosition(index: number) {
    setSecondaryPositions((prev) => prev.filter((_, i) => i !== index));
  }

  const usedPositions = new Set([position, ...secondaryPositions].filter(Boolean));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("O jogador precisa de um nome.");
      return;
    }

    const cleanSecondary = secondaryPositions.filter(Boolean);

    setSaving(true);
    const patch = {
      name,
      photoUrl: photoUrl || null,
      dateOfBirth: dateOfBirth || null,
      nationality: nationality || null,
      position: position || null,
      secondaryPositions: cleanSecondary,
      overall: overall === "" ? null : Number(overall),
      potential: potential === "" ? null : Number(potential),
      externalLink: externalLink || null,
      currentClubId: currentClub?.id ?? null,
    };
    fetch(`/api/players/${player.cachedPlayerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        toast.success("Jogador atualizado.");
        onSaved(patch);
      })
      .catch(() => toast.error("Não foi possível salvar."))
      .finally(() => setSaving(false));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-player-name">Nome</Label>
        <Input id="edit-player-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-player-photo">Foto</Label>
        <ImageUrlInput id="edit-player-photo" value={photoUrl} onChange={setPhotoUrl} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-player-dob">Data de nascimento</Label>
        <Input
          id="edit-player-dob"
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-player-nationality">Nacionalidade</Label>
        <CountrySelect id="edit-player-nationality" value={nationality} onChange={setNationality} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-player-position">Posição principal</Label>
        <Select value={position} onValueChange={(v) => setPosition(v ?? "")}>
          <SelectTrigger id="edit-player-position">
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
            <Button type="button" size="xs" variant="outline" onClick={addSecondaryPosition}>
              <PlusIcon className="size-3" />
              Adicionar
            </Button>
          )}
        </div>
        {secondaryPositions.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nenhuma posição secundária.</p>
        ) : (
          secondaryPositions.map((secondary, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Select value={secondary} onValueChange={(v) => updateSecondaryPosition(index, v ?? "")}>
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
                onClick={() => removeSecondaryPosition(index)}
                aria-label="Remover posição secundária"
                className="text-muted-foreground hover:text-destructive"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="edit-player-overall">Overall</Label>
          <Input
            id="edit-player-overall"
            type="number"
            min={1}
            max={99}
            value={overall}
            onChange={(e) => setOverall(e.target.value)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="edit-player-potential">Potencial</Label>
          <Input
            id="edit-player-potential"
            type="number"
            min={1}
            max={99}
            value={potential}
            onChange={(e) => setPotential(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Clube atual</Label>
        {loadingCurrentClub ? (
          <p className="text-muted-foreground text-xs">Carregando…</p>
        ) : currentClub ? (
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
        <Label htmlFor="edit-player-link">Link externo (ogol, transfermarket...)</Label>
        <Input
          id="edit-player-link"
          type="url"
          placeholder="https://..."
          value={externalLink}
          onChange={(e) => setExternalLink(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
