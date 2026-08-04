"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const AUTOSAVE_DELAY_MS = 1000;

/**
 * §29-§34: the dedicated stint page's "resumo da temporada" — same
 * autosave shape as CareerSummary/ClubStintCard's summary field, but
 * backed by RichTextEditor instead of a plain Textarea. Content is HTML,
 * stored in the same CareerStint.summary column those plain-text editors
 * already wrote to (no schema change — see rich-text-editor.tsx).
 */
export function CareerStintSummaryEditor({
  careerId,
  stintId,
  summary,
}: {
  careerId: string;
  stintId: string;
  summary?: string | null;
}) {
  const [value, setValue] = useState(summary ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const savedValueRef = useRef(summary ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function save(next: string) {
    if (next === savedValueRef.current) return;
    setStatus("saving");
    fetch(`/api/careers/${careerId}/stints/${stintId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: next }),
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
          Resumo da temporada
        </CardTitle>
        <span className="text-muted-foreground text-xs">
          {status === "saving" ? "Salvando…" : status === "saved" ? "Salvo" : ""}
        </span>
      </CardHeader>
      <CardContent className="py-4">
        <RichTextEditor content={value} onChange={handleChange} onBlur={handleBlur} />
      </CardContent>
    </Card>
  );
}
