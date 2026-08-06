"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/ui/number-field";
import { matchesPlayed } from "@/lib/season";

/**
 * §6: partidas/vitórias/empates/derrotas. "Partidas" is never an editable
 * field — see lib/season.ts's matchesPlayed — so the three inputs here are
 * the only source of truth and the sum just re-renders as they change,
 * structurally ruling out "partidas ≠ V+E+D".
 */
export function PerformanceCard({
  squadId,
  seasonId,
  wins: initialWins,
  draws: initialDraws,
  losses: initialLosses,
}: {
  squadId: string;
  seasonId: string;
  wins: number;
  draws: number;
  losses: number;
}) {
  const [wins, setWins] = useState(initialWins);
  const [draws, setDraws] = useState(initialDraws);
  const [losses, setLosses] = useState(initialLosses);

  function save(patch: { wins?: number; draws?: number; losses?: number }) {
    fetch(`/api/squads/${squadId}/seasons/${seasonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((res) => {
      if (!res.ok) toast.error("Não foi possível salvar o desempenho.");
    });
  }

  function handleChange(field: "wins" | "draws" | "losses", raw: number | null) {
    const value = raw ?? 0;

    if (field === "wins") setWins(value);
    else if (field === "draws") setDraws(value);
    else setLosses(value);
    save({ [field]: value });
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="text-primary size-4" />
          Desempenho
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4 py-4">
        <Stat label="Partidas" value={matchesPlayed({ wins, draws, losses })} />
        <PerformanceField label="Vitórias" value={wins} onChange={(v) => handleChange("wins", v)} />
        <PerformanceField label="Empates" value={draws} onChange={(v) => handleChange("draws", v)} />
        <PerformanceField label="Derrotas" value={losses} onChange={(v) => handleChange("losses", v)} />
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-heading text-2xl font-bold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function PerformanceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Label htmlFor={`perf-${label}`} className="sr-only">
        {label}
      </Label>
      <NumberField
        id={`perf-${label}`}
        min={0}
        value={value}
        onChange={onChange}
        className="font-heading h-10 w-16 text-center text-lg font-bold"
      />
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}
