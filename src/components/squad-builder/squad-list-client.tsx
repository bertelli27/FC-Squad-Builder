"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SquadCard, type SquadCardData } from "./squad-card";

export function SquadListClient({ squads: initialSquads }: { squads: SquadCardData[] }) {
  // Owned as local state (not just read from props) so a favorite toggle
  // updates the filters/sort immediately without a full page reload —
  // the PATCH still happens, just in the background (see handleToggleFavorite).
  const [squads, setSquads] = useState(initialSquads);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favoritesFirst, setFavoritesFirst] = useState(false);

  function handleToggleFavorite(id: string, isFavorite: boolean) {
    setSquads((prev) => prev.map((s) => (s.id === id ? { ...s, isFavorite } : s)));

    fetch(`/api/squads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite }),
    }).then((res) => {
      if (res.ok) return;
      // Revert on failure — the optimistic flip above was wrong.
      setSquads((prev) => prev.map((s) => (s.id === id ? { ...s, isFavorite: !isFavorite } : s)));
      toast.error("Não foi possível favoritar o elenco.");
    });
  }

  const visible = useMemo(() => {
    const filtered = onlyFavorites ? squads.filter((s) => s.isFavorite) : squads;
    if (!favoritesFirst) return filtered;
    // Stable sort: only reorders by favorite status, preserving the
    // original (most-recently-updated-first) order within each group.
    return [...filtered].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  }, [squads, onlyFavorites, favoritesFirst]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={onlyFavorites ? "default" : "outline"}
          size="sm"
          onClick={() => setOnlyFavorites((v) => !v)}
        >
          <Star className={cn("size-4", onlyFavorites && "fill-current")} />
          Somente favoritos
        </Button>
        <Button
          variant={favoritesFirst ? "default" : "outline"}
          size="sm"
          onClick={() => setFavoritesFirst((v) => !v)}
        >
          Favoritos primeiro
        </Button>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Nenhum elenco favoritado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((squad) => (
            <SquadCard key={squad.id} squad={squad} onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      )}
    </div>
  );
}
