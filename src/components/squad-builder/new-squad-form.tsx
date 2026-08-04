"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Shield, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySelect } from "./category-select";
import { TagsInput } from "./tags-input";

const FORMATIONS = ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "4-1-4-1", "3-4-3", "5-3-2"];

type BaseKind = "club" | "nationalTeam" | "none";

interface SearchResult {
  externalId: string;
  name: string;
  country?: string;
  logoUrl?: string;
  flagUrl?: string;
}

export function NewSquadForm() {
  const router = useRouter();
  const [kind, setKind] = useState<BaseKind>("club");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [name, setName] = useState("");
  const [formation, setFormation] = useState(FORMATIONS[0]);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [isSubmitting, startSubmitting] = useTransition();

  useEffect(() => {
    if (kind === "none" || query.trim().length < 2) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setIsSearching(true);
      const endpoint = kind === "club" ? "/api/clubs/search" : "/api/national-teams/search";
      fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setResults(data.clubs ?? data.nationalTeams ?? []))
        .catch((err) => {
          if (err.name !== "AbortError") toast.error("Falha ao buscar.");
        })
        .finally(() => setIsSearching(false));
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, kind]);

  const showResults = kind !== "none" && query.trim().length >= 2 && results.length > 0;

  function handleKindChange(value: string) {
    setKind(value as BaseKind);
    setQuery("");
    setResults([]);
    setSelected(null);
  }

  function selectResult(result: SearchResult) {
    setSelected(result);
    setResults([]);
    setQuery(result.name);
    if (!name) setName(result.name);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Dê um nome ao elenco.");
      return;
    }
    if (!Number.isInteger(startYear)) {
      toast.error("Informe um ano de início válido.");
      return;
    }

    startSubmitting(async () => {
      const res = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          formation,
          startYear,
          base: kind !== "none" && selected ? { kind, name: selected.name } : undefined,
          categoryId,
          tagNames,
        }),
      });

      if (!res.ok) {
        toast.error("Não foi possível criar o elenco.");
        return;
      }

      const { squad, season } = await res.json();
      toast.success(`Elenco "${squad.name}" criado.`);
      router.push(`/squads/${squad.id}/seasons/${season.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3 [.border-b]:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="text-primary size-4" />
            Origem do elenco
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label>Carregar elenco a partir de</Label>
            <Tabs value={kind} onValueChange={handleKindChange}>
              <TabsList>
                <TabsTrigger value="club">Clube</TabsTrigger>
                <TabsTrigger value="nationalTeam">Seleção</TabsTrigger>
                <TabsTrigger value="none">Do zero</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {kind !== "none" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="search">{kind === "club" ? "Buscar clube" : "Buscar seleção"}</Label>
              <div className="relative">
                <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  id="search"
                  className="pl-9"
                  placeholder={kind === "club" ? "Ex: Coritiba" : "Ex: Brasil"}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                  }}
                  autoComplete="off"
                />
              </div>

              {isSearching && <p className="text-muted-foreground text-sm">Buscando…</p>}

              {showResults && (
                <ul className="divide-border max-h-64 overflow-y-auto rounded-lg border">
                  {results.map((result) => (
                    <li key={result.externalId}>
                      <button
                        type="button"
                        onClick={() => selectResult(result)}
                        className="hover:bg-accent flex w-full items-center gap-3 px-3 py-2 text-left text-sm"
                      >
                        {(result.logoUrl ?? result.flagUrl) && (
                          <Image
                            src={result.logoUrl ?? result.flagUrl!}
                            alt=""
                            width={24}
                            height={24}
                            className="size-6 object-contain"
                            unoptimized
                          />
                        )}
                        <span>{result.name}</span>
                        {result.country && (
                          <span className="text-muted-foreground ml-auto">{result.country}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selected && (
                <p className="text-muted-foreground text-sm">
                  Selecionado:{" "}
                  <span className="text-foreground font-medium">{selected.name}</span>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3 [.border-b]:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="text-primary size-4" />
            Detalhes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome do elenco</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Time dos Sonhos"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="formation">Formação</Label>
            <Select value={formation} onValueChange={(value) => value && setFormation(value)}>
              <SelectTrigger id="formation" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATIONS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="start-year">Ano de início</Label>
            <Input
              id="start-year"
              type="number"
              className="w-28"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Categoria</Label>
            <CategorySelect value={categoryId} onChange={setCategoryId} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Tags</Label>
            <TagsInput value={tagNames} onChange={setTagNames} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Criando…" : "Criar elenco"}
      </Button>
    </form>
  );
}
