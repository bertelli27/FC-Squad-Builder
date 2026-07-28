"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MAIN_ATTRIBUTES, ATTRIBUTE_GROUPS, ATTRIBUTE_LABELS } from "@/lib/attribute-labels";
import type { Player } from "@/types/domain";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PlayerProfileDialog({
  name,
  club,
  className,
  "aria-label": ariaLabel,
  children,
}: {
  name: string;
  club?: string | null;
  className?: string;
  "aria-label"?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next || player || status === "loading") return;

    setStatus("loading");
    const params = new URLSearchParams({ name });
    if (club) params.set("club", club);

    fetch(`/api/players/profile?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data) => {
        setPlayer(data.player);
        setStatus("idle");
      })
      .catch(() => setStatus("error"));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        className={className}
        aria-label={ariaLabel}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {children}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{player?.name ?? name}</DialogTitle>
        </DialogHeader>

        {status === "loading" && <ProfileSkeleton />}
        {status === "error" && (
          <p className="text-muted-foreground text-sm">Não foi possível carregar o perfil.</p>
        )}
        {player && <ProfileContent player={player} />}
      </DialogContent>
    </Dialog>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

function ProfileContent({ player }: { player: Player }) {
  const attributes = player.attributes;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar size="lg" className="size-16">
          {player.photoUrl && <AvatarImage src={player.photoUrl} alt={player.name} />}
          <AvatarFallback className="text-base">{initials(player.name)}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-muted-foreground truncate text-sm">
            {[player.position, player.club, player.nationality].filter(Boolean).join(" · ")}
          </span>
          {player.age != null && (
            <span className="text-muted-foreground text-xs">{player.age} anos</span>
          )}
        </div>
        {player.overall != null && (
          <Badge variant="secondary" className="text-base">
            {player.overall}
          </Badge>
        )}
      </div>

      {attributes ? (
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
