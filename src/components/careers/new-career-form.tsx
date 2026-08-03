"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/player-card/player-avatar";

interface SearchResult {
  source: string;
  externalId: string;
  name: string;
  position?: string;
  club?: string;
  photoUrl?: string;
}

/**
 * §14: searching first (same /api/players/search the rest of the app
 * already uses) lets the career reuse an existing CachedPlayer instead of
 * always starting from a disconnected blank identity — picking a result
 * fills name/photo and remembers the reference; typing a name without
 * picking one just creates the career with no CachedPlayer link at all.
 */
export function NewCareerForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSubmitting, startSubmitting] = useTransition();

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/players/search?name=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setResults(data.players ?? []))
        .catch((err) => {
          if (err.name !== "AbortError") toast.error("Falha ao buscar.");
        });
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function selectResult(result: SearchResult) {
    setSelected(result);
    setResults([]);
    setQuery(result.name);
    setName(result.name);
    if (result.photoUrl) setPhotoUrl(result.photoUrl);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setSelected(null);
    setName(value);
    if (value.trim().length < 2) setResults([]);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome ao jogador.");
      return;
    }

    startSubmitting(async () => {
      const res = await fetch("/api/careers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          photoUrl: photoUrl || undefined,
          source: selected?.source,
          externalId: selected?.externalId,
        }),
      });

      if (!res.ok) {
        toast.error("Não foi possível criar a carreira.");
        return;
      }

      const { career } = await res.json();
      toast.success(`Carreira de "${career.name}" criada.`);
      router.push(`/careers/${career.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3 [.border-b]:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="text-primary size-4" />
            Buscar jogador existente (opcional)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, ou digitar direto o nome do jogador"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              autoComplete="off"
            />
          </div>

          {results.length > 0 && (
            <ul className="divide-border max-h-64 overflow-y-auto rounded-lg border">
              {results.map((result) => (
                <li key={`${result.source}:${result.externalId}`}>
                  <button
                    type="button"
                    onClick={() => selectResult(result)}
                    className="hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
                  >
                    <PlayerAvatar src={result.photoUrl} name={result.name} size="sm" />
                    <span>{result.name}</span>
                    {result.club && <span className="text-muted-foreground ml-auto text-xs">{result.club}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <p className="text-muted-foreground text-sm">
              Vinculado a: <span className="text-foreground font-medium">{selected.name}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3 [.border-b]:pb-3">
          <CardTitle className="text-base">Detalhes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="career-name">Nome</Label>
            <Input id="career-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="career-photo">URL da foto</Label>
            <ImageUrlInput id="career-photo" value={photoUrl} onChange={setPhotoUrl} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Criando…" : "Criar carreira"}
      </Button>
    </form>
  );
}
