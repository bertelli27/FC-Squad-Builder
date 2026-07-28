"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlayerAvatar } from "./player-avatar";
import { OverallBadge } from "./overall-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MAIN_ATTRIBUTES, ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS } from "@/lib/attribute-labels";
import { ratingStyle } from "@/lib/rating-tier";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/domain";

export interface KnownPlayerInfo {
  name: string;
  club?: string | null;
  position?: string | null;
  photoUrl?: string | null;
  overall?: number | null;
  externalLink?: string | null;
}

export function PlayerProfileDialog({
  player: known,
  className,
  "aria-label": ariaLabel,
  children,
}: {
  player: KnownPlayerInfo;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [enriched, setEnriched] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next || fetched || loading) return;

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

  // Known (trusted, came straight from the club/national-team roster) is
  // the baseline; enrichment only fills in what's still missing (chiefly
  // attributes, plus nationality/age which rosters don't carry).
  const displayed: Player = {
    id: enriched?.id ?? "",
    source: enriched?.source ?? "",
    externalId: enriched?.externalId ?? "",
    name: known.name,
    club: known.club ?? undefined,
    position: known.position ?? undefined,
    photoUrl: known.photoUrl ?? undefined,
    overall: known.overall ?? undefined,
    externalLink: known.externalLink ?? undefined,
    ...enriched,
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className={className} aria-label={ariaLabel}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{displayed.name}</DialogTitle>
        </DialogHeader>

        <ProfileContent player={displayed} attributesLoading={loading} />
      </DialogContent>
    </Dialog>
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
                  <span className="text-lg font-semibold">{value}</span>
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
                  <h3 className="text-muted-foreground mb-1 text-xs font-medium uppercase">
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
