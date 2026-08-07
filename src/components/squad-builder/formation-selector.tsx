"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORMATIONS } from "@/lib/formations";

export function FormationSelector({
  seasonId,
  lineupId,
  formation,
}: {
  seasonId: string;
  lineupId: string;
  formation: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === formation) return;

    startTransition(async () => {
      const res = await fetch(`/api/seasons/${seasonId}/lineups/${lineupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formation: value }),
      });
      if (!res.ok) {
        toast.error("Não foi possível trocar a formação.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Select value={formation} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="w-28" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.keys(FORMATIONS).map((f) => (
          <SelectItem key={f} value={f}>
            {f}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
