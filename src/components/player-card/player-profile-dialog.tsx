"use client";

import { useState } from "react";
import Link from "next/link";
import { PencilIcon, ArrowRightLeftIcon, UserRoundIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlayerAvatar } from "./player-avatar";
import { OverallBadge } from "./overall-badge";
import { PlayerStatsSection } from "./player-stats-section";
import { EditPlayerForm } from "./edit-player-form";
import { TransferPlayerForm } from "./transfer-player-form";
import { Skeleton } from "@/components/ui/skeleton";
import { MAIN_ATTRIBUTES, ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS } from "@/lib/attribute-labels";
import { ratingStyle } from "@/lib/rating-tier";
import { POSITIONS } from "@/lib/positions";
import { countryFlag } from "@/lib/countries";
import { ageAtSeason, ageToday } from "@/lib/player-age";
import { cn } from "@/lib/utils";
import type { Player } from "@/types/domain";

export interface KnownPlayerInfo {
  cachedPlayerId?: string | null;
  source?: string | null;
  name: string;
  club?: string | null;
  position?: string | null;
  secondaryPositions?: string[] | null;
  nationality?: string | null;
  dateOfBirth?: string | null;
  photoUrl?: string | null;
  overall?: number | null;
  potential?: number | null;
  externalLink?: string | null;
  /** §26 etapa 8 — set when this player has a linked PlayerCareer, to show "Ver carreira". */
  careerId?: string | null;
}

const CUSTOM_SOURCE = "custom";

export function PlayerProfileDialog({
  player: known,
  seasonId,
  squadPlayerId,
  /** Reference temporada for the age display (§5/§19) — defaults to today's date when omitted (e.g. search dialogs). */
  ageReference,
  onUpdated,
  onTransferredOut,
  className,
  "aria-label": ariaLabel,
  children,
}: {
  player: KnownPlayerInfo;
  /** Only needed for stats — the profile-stats section is squad/season-scoped. */
  seasonId?: string;
  squadPlayerId?: string;
  ageReference?: { startYear: number; calendar: string };
  onUpdated?: (patch: Partial<Omit<KnownPlayerInfo, "cachedPlayerId">>) => void;
  /** Etapa 7 (§2-§7) — only needed to show "Transferir jogador"; called (with the destination club) after a successful transfer, once the player has already left this season's roster server-side. */
  onTransferredOut?: (counterpartClub: string) => void;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "transfer">("view");
  const [enriched, setEnriched] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const isCustom = known.source === CUSTOM_SOURCE;
  // Etapa 6 (§16/§24): editing is no longer limited to "custom" players —
  // any CachedPlayer's cadastral data can be edited, since it's the same
  // central record wherever it's referenced.
  const canEdit = !!known.cachedPlayerId;
  // §2: transferring is only meaningful for a player actually on this
  // season's roster right now, not e.g. a search result before adding.
  const canTransfer = !!onTransferredOut && !!seasonId && !!squadPlayerId;

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

  // Known (trusted — came straight from the squad/career's own data,
  // reflecting whatever's actually stored on the CachedPlayer row) is the
  // baseline and always wins; enrichment only fills in fields known
  // doesn't have at all (attributes/league never come from known — no
  // cadastral edit form has ever exposed those). Etapa 6 widened `known`
  // to carry nationality/dateOfBirth/secondaryPositions/potential too
  // (previously only enrichment ever supplied these), since those are now
  // real, editable CachedPlayer fields rather than provider-only data.
  const displayed: Player = {
    id: enriched?.id ?? "",
    source: known.source ?? enriched?.source ?? "",
    externalId: enriched?.externalId ?? "",
    name: known.name,
    club: known.club ?? enriched?.club,
    position: known.position ?? enriched?.position,
    secondaryPositions: known.secondaryPositions ?? enriched?.secondaryPositions ?? undefined,
    photoUrl: known.photoUrl ?? enriched?.photoUrl,
    overall: known.overall ?? enriched?.overall,
    externalLink: known.externalLink ?? enriched?.externalLink,
    nationality: known.nationality ?? enriched?.nationality,
    dateOfBirth: known.dateOfBirth ?? enriched?.dateOfBirth ?? undefined,
    age: enriched?.age,
    league: enriched?.league,
    potential: known.potential ?? enriched?.potential,
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
            {mode === "view" && (
              <span className="flex items-center gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    aria-label="Editar jogador"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                )}
                {canTransfer && (
                  <button
                    type="button"
                    onClick={() => setMode("transfer")}
                    aria-label="Transferir jogador"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowRightLeftIcon className="size-4" />
                  </button>
                )}
                {known.careerId && (
                  <Link
                    href={`/careers/${known.careerId}`}
                    aria-label="Ver carreira"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <UserRoundIcon className="size-4" />
                  </Link>
                )}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {mode === "edit" && known.cachedPlayerId ? (
          <EditPlayerForm
            player={{
              cachedPlayerId: known.cachedPlayerId,
              name: known.name,
              photoUrl: displayed.photoUrl,
              dateOfBirth: displayed.dateOfBirth,
              nationality: displayed.nationality,
              position: displayed.position,
              secondaryPositions: displayed.secondaryPositions,
              overall: displayed.overall,
              potential: displayed.potential,
              externalLink: displayed.externalLink,
            }}
            onCancel={() => setMode("view")}
            onSaved={(patch) => {
              onUpdated?.(patch);
              setMode("view");
            }}
          />
        ) : mode === "transfer" && seasonId && squadPlayerId ? (
          <TransferPlayerForm
            seasonId={seasonId}
            squadPlayerId={squadPlayerId}
            onCancel={() => setMode("view")}
            onTransferred={(counterpartClub) => {
              onTransferredOut?.(counterpartClub);
              setOpen(false);
            }}
          />
        ) : (
          <>
            <ProfileContent player={displayed} attributesLoading={loading} ageReference={ageReference} />
            {seasonId && squadPlayerId && (
              <PlayerStatsSection seasonId={seasonId} squadPlayerId={squadPlayerId} />
            )}
          </>
        )}
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
  ageReference,
}: {
  player: Player;
  attributesLoading: boolean;
  ageReference?: { startYear: number; calendar: string };
}) {
  const attributes = player.attributes;
  const tier = ratingStyle(player.overall);
  const flag = countryFlag(player.nationality);
  // §5/§19: prefer the season-aware calculation from a stored date of
  // birth; `player.age` (the legacy static field, only ever populated for
  // Kaggle-sourced rows) is a last-resort fallback for players who don't
  // have a date of birth on file yet.
  const age = player.dateOfBirth
    ? ageReference
      ? ageAtSeason(player.dateOfBirth, ageReference.startYear, ageReference.calendar)
      : ageToday(player.dateOfBirth)
    : player.age;
  const secondaryLabels = (player.secondaryPositions ?? [])
    .map((p) => POSITIONS.find((pos) => pos.value === p)?.label ?? p)
    .join(", ");

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
            {[player.position, player.club, flag ? `${flag} ${player.nationality}` : player.nationality]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {secondaryLabels && (
            <span className="text-muted-foreground truncate text-xs">Também joga: {secondaryLabels}</span>
          )}
          {age != null && <span className="text-muted-foreground text-xs">{age} anos</span>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <OverallBadge overall={player.overall} className="h-7 px-2.5 text-base" />
          {player.potential != null && (
            <span className="text-muted-foreground text-xs">Pot. {player.potential}</span>
          )}
        </div>
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
