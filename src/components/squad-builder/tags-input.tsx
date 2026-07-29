"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

/**
 * Shared between NewSquadForm and EditSquadDialog. Tags are plain names
 * here (not ids) — squadService.updateSquad/createSquad already resolve
 * names via tagService.findOrCreateTags, so the caller never needs a Tag
 * id, just the final list of names the squad should have.
 */
export function TagsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => (res.ok ? res.json() : { tags: [] }))
      .then((data) => setAllTags((data.tags ?? []).map((t: { name: string }) => t.name)))
      .catch(() => {});
  }, []);

  const suggestions = input.trim()
    ? allTags
        .filter((t) => t.toLowerCase().includes(input.trim().toLowerCase()) && !value.includes(t))
        .slice(0, 6)
    : [];

  function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput("");
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <button type="button" aria-label={`Remover tag ${tag}`} onClick={() => removeTag(tag)}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <Input
          placeholder="Adicionar tag e pressionar Enter"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag(input);
            }
          }}
        />
        {suggestions.length > 0 && (
          <ul className="bg-popover text-popover-foreground ring-foreground/10 absolute z-10 mt-1 w-full rounded-lg shadow-md ring-1">
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="hover:bg-accent w-full px-3 py-1.5 text-left text-sm"
                  onClick={() => addTag(s)}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
