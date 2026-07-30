"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ConflictStrategy = "keep-both" | "replace";

/**
 * "Exportar tudo" is a plain navigation to a GET route that responds with
 * a Content-Disposition: attachment header — no JS needed to trigger the
 * download. Import needs a round-trip (pick file -> choose conflict
 * strategy -> confirm) since the format allows importing several squads
 * whose names might already exist locally.
 */
export function ImportExportBar() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<unknown>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [strategy, setStrategy] = useState<ConflictStrategy>("keep-both");
  const [importing, setImporting] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    file
      .text()
      .then((text) => {
        const parsed = JSON.parse(text);
        const count = Array.isArray(parsed?.squads) ? parsed.squads.length : 0;
        if (count === 0) {
          toast.error('Arquivo inválido: esperado um objeto com a chave "squads".');
          return;
        }
        setPendingFile(parsed);
        setPendingCount(count);
      })
      .catch(() => toast.error("Não foi possível ler o arquivo — verifique se é um .json válido."));
  }

  function handleConfirmImport() {
    setImporting(true);
    fetch("/api/squads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: pendingFile, strategy }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { imported: number; errors: string[] }) => {
        toast.success(`${data.imported} elenco(s) importado(s).`);
        if (data.errors.length > 0) {
          toast.error(`${data.errors.length} item(ns) ignorado(s) por dados inválidos.`);
        }
        setPendingFile(null);
        router.refresh();
      })
      .catch(() => toast.error("Não foi possível importar o arquivo."))
      .finally(() => setImporting(false));
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<a href="/api/squads/export" download />}
      >
        <Download className="size-4" />
        Exportar tudo
      </Button>

      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
        <Upload className="size-4" />
        Importar
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog open={pendingFile !== null} onOpenChange={(open) => !open && setPendingFile(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar {pendingCount} elenco(s)</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground text-sm">
            Se algum elenco do arquivo tiver o mesmo nome de um já existente, o que
            fazer?
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setStrategy("keep-both")}
              className={cn(
                "rounded-lg border p-3 text-left text-sm",
                strategy === "keep-both" ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <p className="font-medium">Manter os dois</p>
              <p className="text-muted-foreground">
                O elenco importado é criado com um nome ajustado (ex: &quot;Nome (Importado)&quot;).
              </p>
            </button>
            <button
              type="button"
              onClick={() => setStrategy("replace")}
              className={cn(
                "rounded-lg border p-3 text-left text-sm",
                strategy === "replace" ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <p className="font-medium">Substituir</p>
              <p className="text-muted-foreground">
                O elenco existente com o mesmo nome é apagado e substituído pelo importado.
              </p>
            </button>
          </div>

          <Button onClick={handleConfirmImport} disabled={importing} className="w-fit">
            {importing ? "Importando…" : "Confirmar importação"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
