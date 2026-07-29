"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderCog, PencilIcon, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import type { CategoryOption } from "./category-select";

/**
 * Rename/delete categories. Deleting doesn't touch any Squad rows directly
 * — the FK's onDelete: SetNull (schema.prisma) clears categoryId on
 * whatever squads pointed here, which is exactly "move to Outros" since
 * that's just how the UI labels a null category.
 */
export function ManageCategoriesDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  useEffect(() => {
    if (!open) return;
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => setCategories(data.categories ?? []))
      .catch(() => {});
  }, [open]);

  function startEditing(category: CategoryOption) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function saveRename(id: string) {
    const name = editingName.trim();
    if (!name) return;

    fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setCategories((prev) => prev.map((c) => (c.id === id ? data.category : c)));
        setEditingId(null);
        router.refresh();
      })
      .catch(() => toast.error("Não foi possível renomear."));
  }

  async function handleDelete(category: CategoryOption) {
    const ok = await confirm({
      title: `Excluir a categoria "${category.name}"?`,
      description: 'Os elencos dessa categoria passam a aparecer em "Outros".',
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Não foi possível excluir a categoria.");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== category.id));
    toast.success(`Categoria "${category.name}" excluída.`);
    router.refresh();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <FolderCog className="size-4" />
          Categorias
        </Button>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar categorias</DialogTitle>
          </DialogHeader>

          {categories.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma categoria ainda — crie uma ao criar ou editar um elenco.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="hover:bg-accent/40 flex items-center gap-2 rounded-lg p-2"
                >
                  {editingId === category.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveRename(category.id)}
                        autoFocus
                        className="h-8 flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Salvar"
                        onClick={() => saveRename(category.id)}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Cancelar"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{category.name}</span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Renomear ${category.name}`}
                        onClick={() => startEditing(category)}
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Excluir ${category.name}`}
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}
