"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const AUTOSAVE_DELAY_MS = 1000;

/**
 * Free-text notes about the squad — tactics, transfer targets, whatever.
 * Autosaves 1s after typing stops (and immediately on blur), same PATCH
 * /api/squads/[id] endpoint EditSquadDialog uses for its other fields.
 * No toasts on every keystroke-triggered save — a quiet inline
 * "Salvando…/Salvo" label next to the title is enough feedback for
 * something that saves this often.
 */
export function SquadNotes({
  squadId,
  seasonId,
  notes,
}: {
  squadId: string;
  seasonId: string;
  notes?: string | null;
}) {
  const [value, setValue] = useState(notes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedValueRef = useRef(notes ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function save(next: string) {
    if (next === savedValueRef.current) return;
    setStatus("saving");
    fetch(`/api/squads/${squadId}/seasons/${seasonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: next }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("save failed");
        savedValueRef.current = next;
        setStatus("saved");
      })
      .catch(() => setStatus("idle"));
  }

  function handleChange(next: string) {
    setValue(next);
    setStatus("idle");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => save(next), AUTOSAVE_DELAY_MS);
  }

  function handleBlur() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    save(value);
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <NotebookPen className="text-primary size-4" />
          Observações
        </CardTitle>
        <span className="text-muted-foreground text-xs">
          {status === "saving" ? "Salvando…" : status === "saved" ? "Salvo" : ""}
        </span>
      </CardHeader>
      <CardContent className="py-4">
        <Textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          placeholder="Anotações sobre o elenco — tática, alvos de contratação, o que quiser…"
          className="min-h-32"
        />
      </CardContent>
    </Card>
  );
}
