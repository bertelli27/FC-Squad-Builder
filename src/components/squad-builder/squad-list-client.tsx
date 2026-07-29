"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SquadCard, type SquadCardData } from "./squad-card";
import { ManageCategoriesDialog } from "./manage-categories-dialog";
import type { CategoryOption } from "./category-select";

const ALL_CATEGORIES = "__all__";
const NO_CATEGORY = "__none__";
const UNCATEGORIZED_LABEL = "Outros";

export function SquadListClient({
  squads: initialSquads,
  categories,
}: {
  squads: SquadCardData[];
  categories: CategoryOption[];
}) {
  // Owned as local state (not just read from props) so a favorite toggle
  // updates the filters/sort immediately without a full page reload —
  // the PATCH still happens, just in the background (see handleToggleFavorite).
  const [squads, setSquads] = useState(initialSquads);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favoritesFirst, setFavoritesFirst] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

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

  function sortIfNeeded(list: SquadCardData[]) {
    if (!favoritesFirst) return list;
    // Stable sort: only reorders by favorite status, preserving the
    // original (most-recently-updated-first) order within each group.
    return [...list].sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  }

  const filtered = useMemo(() => {
    let list = onlyFavorites ? squads.filter((s) => s.isFavorite) : squads;
    if (categoryFilter === NO_CATEGORY) list = list.filter((s) => s.categoryId === null);
    else if (categoryFilter !== ALL_CATEGORIES) list = list.filter((s) => s.categoryId === categoryFilter);
    return list;
  }, [squads, onlyFavorites, categoryFilter]);

  // Grouped by category only in the "all categories" view — picking one
  // specific category (or "Outros") already narrows it down, so a flat
  // list reads better than a single lonely group heading.
  const groups = useMemo(() => {
    if (categoryFilter !== ALL_CATEGORIES) return null;

    const byId = new Map(categories.map((c) => [c.id, c.name]));
    const buckets = new Map<string, SquadCardData[]>();
    for (const squad of filtered) {
      const key = squad.categoryId ?? NO_CATEGORY;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(squad);
    }

    const ordered: { key: string; label: string; squads: SquadCardData[] }[] = [];
    for (const category of categories) {
      const bucket = buckets.get(category.id);
      if (bucket?.length) ordered.push({ key: category.id, label: byId.get(category.id)!, squads: bucket });
    }
    const uncategorized = buckets.get(NO_CATEGORY);
    if (uncategorized?.length) {
      ordered.push({ key: NO_CATEGORY, label: UNCATEGORIZED_LABEL, squads: uncategorized });
    }
    return ordered;
  }, [filtered, categoryFilter, categories]);

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

        <Select value={categoryFilter} onValueChange={(v) => v && setCategoryFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
            <SelectItem value={NO_CATEGORY}>{UNCATEGORIZED_LABEL}</SelectItem>
          </SelectContent>
        </Select>

        <ManageCategoriesDialog />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {onlyFavorites ? "Nenhum elenco favoritado ainda." : "Nenhum elenco encontrado."}
          </p>
        </div>
      ) : groups ? (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <h2 className="font-heading text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                {group.label} <span className="normal-case">({group.squads.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sortIfNeeded(group.squads).map((squad) => (
                  <SquadCard key={squad.id} squad={squad} onToggleFavorite={handleToggleFavorite} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortIfNeeded(filtered).map((squad) => (
            <SquadCard key={squad.id} squad={squad} onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      )}
    </div>
  );
}
