"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ShieldIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SquadPicker, type SquadOption } from "@/components/management/squad-picker";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import type { HallOfFameEntryVM } from "./hall-of-fame-card";

interface PlayerOption {
  id: string;
  name: string;
  photoUrl: string | null;
}

interface CoachOption {
  id: string;
  name: string;
  photoUrl: string | null;
}

/**
 * Mesmo padrão de busca-e-seleciona de SquadPicker/edit-player-form.tsx
 * (currentClub), aqui pra jogador OU técnico. O pai monta isto com
 * `key={honoreeKind}` (não um `useEffect` de reset) pra trocar de aba
 * jogador↔técnico sempre remontar com busca limpa.
 */
function HonoreePicker({ kind, onSelect }: { kind: "player" | "coach"; onSelect: (option: PlayerOption | CoachOption) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(PlayerOption | CoachOption)[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      const url = kind === "player" ? `/api/players/local-search?q=${encodeURIComponent(query)}` : `/api/coaches?q=${encodeURIComponent(query)}`;
      fetch(url, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { players: [], coaches: [] }))
        .then((data) => setResults(kind === "player" ? (data.players ?? []) : (data.coaches ?? [])))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, kind]);

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        placeholder={kind === "player" ? "Buscar jogador já cadastrado…" : "Buscar técnico já cadastrado…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {query.trim().length >= 2 && results.length > 0 && (
        <ul className="divide-border max-h-56 overflow-y-auto rounded-lg border">
          {results.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onSelect(option)}
                className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
              >
                <PlayerAvatar src={option.photoUrl} name={option.name} size="sm" />
                <span>{option.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && results.length === 0 && <p className="text-muted-foreground text-xs">Nenhum resultado.</p>}
    </div>
  );
}

/**
 * Etapa 10.6 (§8/§18) — criar/editar uma entrada oficial do Hall da Fama.
 * O homenageado (jogador OU técnico) só é escolhido na criação — editar
 * não troca quem é o homenageado (ver comentário em
 * hallOfFameService.updateEntry); pra isso a UI pede excluir e criar outro.
 * `initialHonoree` pré-preenche a partir de um candidato (§7 — "Adicionar
 * ao Hall da Fama" do card de candidato), mas a criação continua exigindo
 * confirmação manual do usuário, nunca é automática.
 */
export function HallOfFameEntryDialog({
  open,
  onOpenChange,
  entry,
  initialHonoree,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null/undefined = criar; presente = editar esta entrada. */
  entry?: HallOfFameEntryVM | null;
  /** pré-seleção vinda de um card de candidato — só usada na criação. */
  initialHonoree?: { cachedPlayerId: string; name: string; photoUrl: string | null } | null;
  onSaved: (entry: HallOfFameEntryVM) => void;
  onDeleted?: (id: string) => void;
}) {
  const [honoreeKind, setHonoreeKind] = useState<"player" | "coach">("player");
  const [honoree, setHonoree] = useState<PlayerOption | CoachOption | null>(
    initialHonoree ? { id: initialHonoree.cachedPlayerId, name: initialHonoree.name, photoUrl: initialHonoree.photoUrl } : null,
  );
  const [squad, setSquad] = useState<SquadOption | null>(entry?.squad ? { ...entry.squad, baseKind: null } : null);
  const [title, setTitle] = useState(entry?.title ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [year, setYear] = useState(entry?.year != null ? String(entry.year) : "");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const currentHonoree = entry ? (entry.cachedPlayer ?? entry.coach) : honoree;

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!entry && !honoree) {
      toast.error("Selecione quem está sendo homenageado.");
      return;
    }
    if (!title.trim()) {
      toast.error("Dê um título ao reconhecimento.");
      return;
    }
    if (!year.trim() || !Number.isInteger(Number(year))) {
      toast.error("Informe o ano.");
      return;
    }

    const body = {
      ...(entry ? {} : honoreeKind === "player" ? { cachedPlayerId: honoree!.id } : { coachId: honoree!.id }),
      squadId: squad?.id ?? null,
      title,
      description: description || null,
      year: Number(year),
      imageUrl: imageUrl || null,
    };

    setSaving(true);
    fetch(entry ? `/api/hall-of-fame/${entry.id}` : "/api/hall-of-fame", {
      method: entry ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        onSaved(data.entry);
        toast.success(entry ? "Reconhecimento atualizado." : "Adicionado ao Hall da Fama.");
        onOpenChange(false);
      })
      .catch(() => toast.error("Não foi possível salvar."))
      .finally(() => setSaving(false));
  }

  async function handleDelete() {
    if (!entry) return;
    const ok = await confirm({ title: `Remover "${entry.title}"?`, confirmLabel: "Remover", destructive: true });
    if (!ok) return;

    setDeleting(true);
    const res = await fetch(`/api/hall-of-fame/${entry.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) {
      toast.error("Não foi possível remover.");
      return;
    }
    onDeleted?.(entry.id);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{entry ? "Editar reconhecimento" : "Adicionar ao Hall da Fama"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Homenageado</Label>
              {currentHonoree ? (
                <div className="bg-muted/40 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm">
                  <PlayerAvatar src={currentHonoree.photoUrl} name={currentHonoree.name} size="sm" />
                  <span className="flex-1 truncate">{currentHonoree.name}</span>
                  {!entry && (
                    <button type="button" onClick={() => setHonoree(null)} className="text-muted-foreground hover:text-destructive text-xs">
                      trocar
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Tabs value={honoreeKind} onValueChange={(v) => v && setHonoreeKind(v as "player" | "coach")}>
                    <TabsList>
                      <TabsTrigger value="player">Jogador</TabsTrigger>
                      <TabsTrigger value="coach">Técnico</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <HonoreePicker key={honoreeKind} kind={honoreeKind} onSelect={setHonoree} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Contexto (opcional)</Label>
              {squad ? (
                <div className="bg-muted/40 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm">
                  {squad.logoUrl ? (
                    <Image src={squad.logoUrl} alt="" width={20} height={20} className="size-5 object-contain" unoptimized />
                  ) : (
                    <ShieldIcon className="text-muted-foreground size-5" />
                  )}
                  <span className="flex-1 truncate">{squad.name}</span>
                  <button type="button" onClick={() => setSquad(null)} className="text-muted-foreground hover:text-destructive text-xs">
                    remover
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground text-xs">Sem clube/seleção selecionado = reconhecimento global.</p>
                  <SquadPicker onSelect={setSquad} />
                </>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hof-title">Título do reconhecimento</Label>
              <Input
                id="hof-title"
                placeholder="Ex: Lenda do clube"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hof-year">Ano</Label>
              <Input id="hof-year" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hof-description">Justificativa (opcional)</Label>
              <Textarea id="hof-description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hof-image">Imagem (opcional)</Label>
              <ImageUrlInput id="hof-image" value={imageUrl} onChange={setImageUrl} />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancelar
                </Button>
              </div>
              {entry && (
                <Button type="button" variant="ghost" disabled={deleting} onClick={handleDelete} className="text-destructive">
                  <Trash2Icon className="size-4" />
                  Excluir
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
