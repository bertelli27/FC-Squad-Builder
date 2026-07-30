"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export interface TagOption {
  id: string;
  name: string;
}

const ALL_CATEGORIES = "__all__";
const NO_CATEGORY = "__none__";
const UNCATEGORIZED_LABEL = "Outros";

export function SquadListClient({
  squads: initialSquads,
  categories,
  tags,
}: {
  squads: SquadCardData[];
  categories: CategoryOption[];
  tags: TagOption[];
}) {
  // Owned as local state (not just read from props) so a favorite toggle
  // updates the filters/sort immediately without a full page reload —
  // the PATCH still happens, just in the background (see handleToggleFavorite).
  const [squads, setSquads] = useState(initialSquads);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favoritesFirst, setFavoritesFirst] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [query, setQuery] = useState("");

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

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  const visibleTagOptions = tagSearch.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.trim().toLowerCase()))
    : tags;

  const filtered = useMemo(() => {
    let list = onlyFavorites ? squads.filter((s) => s.isFavorite) : squads;
    if (categoryFilter === NO_CATEGORY) list = list.filter((s) => s.categoryId === null);
    else if (categoryFilter !== ALL_CATEGORIES) list = list.filter((s) => s.categoryId === categoryFilter);
    // OR semantics: a squad with any of the selected tags matches.
    if (selectedTagIds.length > 0) {
      list = list.filter((s) => s.tags.some((t) => selectedTagIds.includes(t.id)));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.categoryName?.toLowerCase().includes(q) ||
          s.tags.some((t) => t.name.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [squads, onlyFavorites, categoryFilter, selectedTagIds, query]);

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
      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar elencos por nome, categoria ou tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

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
            {/* Select.Value shows the raw `value` unless told how to render
                it — fine for value===label selects, but here value is a
                category id, so it needs an explicit lookup. */}
            <SelectValue>
              {(v: string) => {
                if (v === ALL_CATEGORIES) return "Todas as categorias";
                if (v === NO_CATEGORY) return UNCATEGORIZED_LABEL;
                return categories.find((c) => c.id === v)?.name ?? v;
              }}
            </SelectValue>
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

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            placeholder="Buscar tag…"
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="h-7 w-36 text-xs"
          />
          {visibleTagOptions.map((tag) => (
            <Badge
              key={tag.id}
              variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleTag(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
          {selectedTagIds.length > 0 && (
            <Button variant="ghost" size="xs" onClick={() => setSelectedTagIds([])}>
              Limpar tags
            </Button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">
            {query.trim()
              ? `Nenhum elenco encontrado para "${query.trim()}".`
              : onlyFavorites
                ? "Nenhum elenco favoritado ainda."
                : "Nenhum elenco encontrado."}
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
