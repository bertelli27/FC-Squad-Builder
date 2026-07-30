"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CategoryOption {
  id: string;
  name: string;
}

const NONE_VALUE = "__none__";

/**
 * Shared between NewSquadForm and EditSquadDialog. "" (mapped to a
 * non-empty sentinel for the Select, since Base UI's SelectItem needs a
 * real value) means no category — displayed/stored as null, which the UI
 * elsewhere labels "Outros" rather than a real category row (see
 * schema.prisma's comment on Squad.categoryId).
 */
export function CategorySelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
  }, []);

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setCategories((prev) =>
          [...prev.filter((c) => c.id !== data.category.id), data.category].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
        onChange(data.category.id);
        setNewName("");
      })
      .catch(() => toast.error("Não foi possível criar a categoria."))
      .finally(() => setCreating(false));
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? null : (v ?? null))}
      >
        <SelectTrigger>
          {/* Select.Value shows the raw `value` unless told how to render it —
              fine when value and label are the same string, but here value
              is a category id, so it needs an explicit lookup. */}
          <SelectValue placeholder="Sem categoria (Outros)">
            {(v: string) =>
              v === NONE_VALUE ? "Sem categoria (Outros)" : (categories.find((c) => c.id === v)?.name ?? v)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Sem categoria (Outros)</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Input
          placeholder="ou criar uma categoria nova"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={creating} onClick={handleCreate}>
          Criar
        </Button>
      </div>
    </div>
  );
}
