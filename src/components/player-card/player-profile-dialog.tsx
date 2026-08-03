"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerAvatar } from "./player-avatar";
import { OverallBadge } from "./overall-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MAIN_ATTRIBUTES, ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS } from "@/lib/attribute-labels";
import { ratingStyle } from "@/lib/rating-tier";
import { POSITIONS } from "@/lib/positions";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/domain";

export interface KnownPlayerInfo {
  source?: string | null;
  name: string;
  club?: string | null;
  position?: string | null;
  photoUrl?: string | null;
  overall?: number | null;
  externalLink?: string | null;
}

const CUSTOM_SOURCE = "custom";

export function PlayerProfileDialog({
  player: known,
  seasonId,
  squadPlayerId,
  onUpdated,
  className,
  "aria-label": ariaLabel,
  children,
}: {
  player: KnownPlayerInfo;
  /** Only needed to enable editing — a custom player viewed without these just can't show the pencil button. */
  seasonId?: string;
  squadPlayerId?: string;
  onUpdated?: (patch: Partial<KnownPlayerInfo>) => void;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [enriched, setEnriched] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const isCustom = known.source === CUSTOM_SOURCE;
  const canEdit = isCustom && !!seasonId && !!squadPlayerId;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setMode("view");
    // Custom players aren't real provider records — searching for one by
    // name against Kaggle/API-Football/TheSportsDB has no club to filter
    // by (custom players never have one), so it was matching whatever
    // same-named real player came back first and letting that overwrite
    // the actual custom data (see the merge below, which used to spread
    // this unconditionally). Skipping the fetch entirely is both correct
    // (there's nothing to enrich — custom players have no attributes to
    // fill in) and avoids wastefully upserting an unrelated player's cache
    // row every time this dialog opens.
    if (fetched || loading || isCustom) return;

    setLoading(true);
    const params = new URLSearchParams({ name: known.name });
    if (known.club) params.set("club", known.club);

    fetch(`/api/players/profile?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      // A miss here isn't an error to surface — it just means no source had
      // a *confident* match (see ProviderRegistry.pickBestMatch), so we
      // fall back to showing what was already known from the squad data.
      .then((data) => setEnriched(data?.player ?? null))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setFetched(true);
      });
  }

  // Known (trusted — came straight from the squad's own data, whether
  // that's a real roster or a custom player's manually-entered fields) is
  // the baseline and always wins; enrichment only fills in fields known
  // doesn't have at all (attributes/nationality/age never come from known,
  // and club/position/photoUrl/overall/externalLink only fall back to
  // enriched if known's own value is missing).
  const displayed: Player = {
    id: enriched?.id ?? "",
    source: known.source ?? enriched?.source ?? "",
    externalId: enriched?.externalId ?? "",
    name: known.name,
    club: known.club ?? enriched?.club,
    position: known.position ?? enriched?.position,
    photoUrl: known.photoUrl ?? enriched?.photoUrl,
    overall: known.overall ?? enriched?.overall,
    externalLink: known.externalLink ?? enriched?.externalLink,
    nationality: enriched?.nationality,
    age: enriched?.age,
    league: enriched?.league,
    potential: enriched?.potential,
    attributes: enriched?.attributes,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={className} aria-label={ariaLabel}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            {displayed.name}
            {canEdit && mode === "view" && (
              <button
                type="button"
                onClick={() => setMode("edit")}
                aria-label="Editar jogador"
                className="text-muted-foreground hover:text-foreground"
              >
                <PencilIcon className="size-4" />
              </button>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === "edit" && seasonId && squadPlayerId ? (
          <EditCustomPlayerForm
            known={known}
            seasonId={seasonId}
            squadPlayerId={squadPlayerId}
            onCancel={() => setMode("view")}
            onSaved={(patch) => {
              onUpdated?.(patch);
              setMode("view");
            }}
          />
        ) : (
          <ProfileContent player={displayed} attributesLoading={loading} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditCustomPlayerForm({
  known,
  seasonId,
  squadPlayerId,
  onSaved,
  onCancel,
}: {
  known: KnownPlayerInfo;
  seasonId: string;
  squadPlayerId: string;
  onSaved: (patch: Partial<KnownPlayerInfo>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(known.name);
  const [position, setPosition] = useState(known.position ?? "");
  const [photoUrl, setPhotoUrl] = useState(known.photoUrl ?? "");
  const [externalLink, setExternalLink] = useState(known.externalLink ?? "");
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("O jogador precisa de um nome.");
      return;
    }
    if (!position) {
      toast.error("Escolha uma posição.");
      return;
    }

    setSaving(true);
    const patch = {
      name,
      position,
      photoUrl: photoUrl || null,
      externalLink: externalLink || null,
    };
    fetch(`/api/seasons/${seasonId}/players/${squadPlayerId}`, {
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
        <Label htmlFor="edit-player-position">Posição</Label>
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
        <Label htmlFor="edit-player-photo">URL da foto</Label>
        <ImageUrlInput id="edit-player-photo" value={photoUrl} onChange={setPhotoUrl} />
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

function AttributesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function ProfileContent({
  player,
  attributesLoading,
}: {
  player: Player;
  attributesLoading: boolean;
}) {
  const attributes = player.attributes;
  const tier = ratingStyle(player.overall);

  return (
    <div className="flex flex-col gap-4">
      {/* -mx-4 -mt-4 bleeds to the dialog's edges, same convention as
          DialogFooter's own bleed — gives the tier-colored gradient a
          proper "player card" banner feel instead of a boxed-in strip. */}
      <div className={cn("-mx-4 -mt-4 flex items-center gap-4 rounded-t-xl p-4 pb-3", tier.banner)}>
        <PlayerAvatar
          src={player.photoUrl}
          name={player.name}
          size="lg"
          className={cn("ring-2", tier.ring)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-muted-foreground truncate text-sm">
            {[player.position, player.club, player.nationality].filter(Boolean).join(" · ")}
          </span>
          {player.age != null && (
            <span className="text-muted-foreground text-xs">{player.age} anos</span>
          )}
        </div>
        <OverallBadge overall={player.overall} className="h-7 px-2.5 text-base" />
      </div>

      {player.externalLink && (
        <a
          href={player.externalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm underline underline-offset-2"
        >
          Ver mais (link externo) →
        </a>
      )}

      {attributesLoading ? (
        <AttributesSkeleton />
      ) : attributes ? (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {MAIN_ATTRIBUTES.flatMap(({ key, label }) => {
              const value = attributes[key];
              if (value == null) return [];
              return (
                <div key={key} className="flex flex-col items-center rounded-lg border p-2">
                  <span className="font-heading text-lg font-bold">{value}</span>
                  <span className="text-muted-foreground text-xs">{label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3">
            {ATTRIBUTE_GROUPS.map(({ label, keys }) => {
              const present = keys.filter((k) => attributes[k] != null);
              if (present.length === 0) return null;
              return (
                <div key={label}>
                  <h3 className="text-muted-foreground font-heading mb-1 text-xs font-semibold uppercase">
                    {label}
                  </h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {present.map((k) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-muted-foreground truncate">
                          {ATTRIBUTE_LABELS[k] ?? k}
                        </span>
                        <span className="font-medium">{attributes[k]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Atributos detalhados não disponíveis para este jogador.
        </p>
      )}
    </div>
  );
}
