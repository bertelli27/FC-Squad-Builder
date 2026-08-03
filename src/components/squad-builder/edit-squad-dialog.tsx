"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUrlInput } from "@/components/ui/image-url-input";
import { ColorPickerInput } from "@/components/ui/color-picker-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategorySelect } from "./category-select";
import { TagsInput } from "./tags-input";
import { SEASON_CALENDARS } from "@/lib/season";
import { isValidHexColor } from "@/lib/club-color";

export interface EditableSquadData {
  id: string;
  name: string;
  logoUrl?: string | null;
  categoryId?: string | null;
  tags?: { id: string; name: string }[];
  baseKind?: string | null;
  primaryColor?: string | null;
  seasonCalendar: string;
}

const BASE_KIND_NONE = "__none__";

function baseKindLabel(value: string): string {
  if (value === "club") return "Clube";
  if (value === "nationalTeam") return "Seleção";
  return "Não definido";
}

function calendarLabel(value: string): string {
  return SEASON_CALENDARS.find((c) => c.value === value)?.label ?? value;
}

export function EditSquadDialog({ squad }: { squad: EditableSquadData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(squad.name);
  const [logoUrl, setLogoUrl] = useState(squad.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(squad.primaryColor ?? "");
  const [seasonCalendar, setSeasonCalendar] = useState(squad.seasonCalendar);
  const [categoryId, setCategoryId] = useState<string | null>(squad.categoryId ?? null);
  const [tagNames, setTagNames] = useState<string[]>(squad.tags?.map((t) => t.name) ?? []);
  const [baseKind, setBaseKind] = useState<string | null>(squad.baseKind ?? null);
  const [saving, setSaving] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("O clube precisa de um nome.");
      return;
    }
    if (primaryColor.trim() && !isValidHexColor(primaryColor)) {
      toast.error("Cor inválida — use o formato #RRGGBB.");
      return;
    }

    setSaving(true);
    fetch(`/api/squads/${squad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        logoUrl,
        primaryColor: primaryColor.trim() || null,
        seasonCalendar,
        categoryId,
        tagNames,
        baseKind,
      }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(() => {
        toast.success("Clube atualizado.");
        setOpen(false);
        router.refresh();
      })
      .catch(() => toast.error("Não foi possível salvar."))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" aria-label="Editar clube" onClick={() => setOpen(true)}>
        <PencilIcon className="size-4" />
        Editar
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar clube</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
              <Shield className="size-3.5" />
              Clube
            </h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="squad-name">Nome do clube</Label>
              <Input
                id="squad-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="squad-logo">URL do escudo</Label>
              <ImageUrlInput id="squad-logo" value={logoUrl} onChange={setLogoUrl} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tipo de elenco</Label>
              <Select
                value={baseKind ?? BASE_KIND_NONE}
                onValueChange={(v) => v && setBaseKind(v === BASE_KIND_NONE ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue>{(v: string) => baseKindLabel(v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="club">Clube</SelectItem>
                  <SelectItem value="nationalTeam">Seleção</SelectItem>
                  <SelectItem value={BASE_KIND_NONE}>Não definido</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Marcar como &quot;Seleção&quot; libera a área de observados e o elenco
                ampliado (26 convocados) em cada temporada — útil pra clubes criados
                antes dessa funcionalidade existir.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Categoria</Label>
              <CategorySelect value={categoryId} onChange={setCategoryId} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tags</Label>
              <TagsInput value={tagNames} onChange={setTagNames} />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4">
            <h3 className="text-muted-foreground font-heading flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
              <Palette className="size-3.5" />
              Identidade visual e temporadas
            </h3>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="squad-color">Cor principal</Label>
              <ColorPickerInput id="squad-color" value={primaryColor} onChange={setPrimaryColor} />
              <p className="text-muted-foreground text-xs">
                Usada nos destaques deste clube (botões, bordas, abas) em todas as
                temporadas. Deixe em branco para usar o verde padrão do app.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Calendário das temporadas</Label>
              <Select value={seasonCalendar} onValueChange={(v) => v && setSeasonCalendar(v)}>
                <SelectTrigger>
                  <SelectValue>{(v: string) => calendarLabel(v)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SEASON_CALENDARS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Brasileiro rotula temporadas como &quot;2026&quot;; europeu, como
                &quot;26/27&quot;.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={saving} className="w-fit">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
