"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ShieldIcon, XIcon, PlusIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { CountrySelect } from "@/components/ui/country-select";
import { SquadPicker, type SquadOption } from "@/components/management/squad-picker";
import { findSimilarNames } from "@/lib/string-similarity";

export interface DestinationValue {
  /** Squad real vinculado, ou null = só o texto livre abaixo (comportamento de sempre, nunca obrigatório). */
  squadId: string | null;
  /** Sempre preenchido — nome do Squad real (snapshot, nunca ressincronizado) quando squadId existe, ou texto livre digitado. */
  name: string;
  logoUrl?: string | null;
}

/**
 * Etapa 10.3 (§15-§17/§25) — escolher o clube de origem/destino de uma
 * transferência: texto livre (como sempre foi), OU buscar um Squad já
 * cadastrado (reaproveita SquadPicker sem alteração), OU criar um clube
 * novo rapidamente (nome/país/escudo — §16) sem sair da tela. Antes de
 * criar, avisa se já existe algo parecido (§25).
 */
export function ClubDestinationPicker({
  value,
  onChange,
  label,
  required,
}: {
  value: DestinationValue;
  onChange: (next: DestinationValue) => void;
  label: string;
  required?: boolean;
}) {
  const [mode, setMode] = useState<"text" | "search" | "create">("text");

  if (value.squadId) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label>{label}</Label>
        <div className="bg-muted/40 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm">
          {value.logoUrl ? (
            <Image src={value.logoUrl} alt="" width={20} height={20} className="size-5 object-contain" unoptimized />
          ) : (
            <ShieldIcon className="text-muted-foreground size-5" />
          )}
          <span className="flex-1 truncate">{value.name}</span>
          <button
            type="button"
            onClick={() => onChange({ squadId: null, name: "" })}
            aria-label="Remover clube vinculado"
            className="text-muted-foreground hover:text-destructive"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input
        value={value.name}
        onChange={(e) => onChange({ squadId: null, name: e.target.value })}
        placeholder={required ? undefined : "Opcional"}
        required={required}
      />
      {mode === "text" && (
        <button
          type="button"
          onClick={() => setMode("search")}
          className="text-primary w-fit text-xs underline-offset-2 hover:underline"
        >
          🔍 Vincular a um clube cadastrado
        </button>
      )}
      {mode === "search" && (
        <div className="flex flex-col gap-1.5 rounded-lg border p-2">
          <SquadPicker
            onSelect={(squad: SquadOption) => {
              onChange({ squadId: squad.id, name: squad.name, logoUrl: squad.logoUrl });
              setMode("text");
            }}
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMode("create")}
              className="text-primary flex items-center gap-1 text-xs underline-offset-2 hover:underline"
            >
              <PlusIcon className="size-3" />
              Criar novo clube
            </button>
            <button
              type="button"
              onClick={() => setMode("text")}
              className="text-muted-foreground text-xs hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {mode === "create" && (
        <QuickCreateClub
          initialName={value.name}
          onCreated={(squad) => {
            onChange({ squadId: squad.id, name: squad.name, logoUrl: squad.logoUrl });
            setMode("text");
          }}
          onCancel={() => setMode("text")}
        />
      )}
    </div>
  );
}

function QuickCreateClub({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string;
  onCreated: (squad: { id: string; name: string; logoUrl: string | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [country, setCountry] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [allSquads, setAllSquads] = useState<SquadOption[]>([]);
  const [confirmedDespiteSimilar, setConfirmedDespiteSimilar] = useState(false);
  const [saving, setSaving] = useState(false);

  // Etapa 10.3 (§25) — busca UMA vez, sem filtro de nome: um `contains`
  // no servidor só acha quando o nome CADASTRADO contém o texto digitado
  // (ex: digitar "Cori" acha "Coritiba"), nunca o contrário (digitar
  // "Coritiba Sub-20" nunca bateria com "Coritiba" via contains) — como o
  // app é de uso pessoal (dezenas de clubes, não milhares), trazer todos e
  // deixar o findSimilarNames (bidirecional, já considera substring nos
  // dois sentidos) filtrar no cliente é o que garante "quis dizer?" certo
  // em ambas as direções, sem refazer a busca a cada tecla digitada.
  useEffect(() => {
    fetch("/api/squads/search")
      .then((res) => (res.ok ? res.json() : { squads: [] }))
      .then((data) => setAllSquads(data.squads ?? []))
      .catch(() => {});
  }, []);

  const similar = name.trim().length >= 3 ? findSimilarNames(name, allSquads) : [];
  const showSimilar = similar.length > 0 && !confirmedDespiteSimilar;

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Dê um nome ao clube.");
      return;
    }
    if (showSimilar) return;

    setSaving(true);
    fetch("/api/squads/quick-create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, country: country || undefined, logoUrl: logoUrl || undefined }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        toast.success(`${data.squad.name} criado.`);
        onCreated(data.squad);
      })
      .catch(() => toast.error("Não foi possível criar o clube."))
      .finally(() => setSaving(false));
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="quick-club-name" className="text-xs">
          Nome
        </Label>
        <Input
          id="quick-club-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setConfirmedDespiteSimilar(false);
          }}
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">País</Label>
        <CountrySelect value={country} onChange={setCountry} />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Escudo</Label>
        <ImageUrlInput value={logoUrl} onChange={setLogoUrl} />
      </div>

      {showSimilar && (
        <div className="bg-muted/40 flex flex-col gap-1.5 rounded-md border p-2 text-xs">
          <span className="font-medium">Você quis dizer este clube?</span>
          {similar.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onCreated(s)}
              className="hover:bg-accent flex items-center gap-2 rounded px-1.5 py-1 text-left"
            >
              {s.logoUrl ? (
                <Image src={s.logoUrl} alt="" width={16} height={16} className="size-4 object-contain" unoptimized />
              ) : (
                <ShieldIcon className="text-muted-foreground size-4" />
              )}
              {s.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setConfirmedDespiteSimilar(true)}
            className="text-muted-foreground w-fit hover:underline"
          >
            Não, criar um clube novo mesmo assim
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={saving} onClick={handleCreate}>
          {saving ? "Criando…" : "Criar e usar"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
