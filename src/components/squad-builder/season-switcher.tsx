"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatSeasonLabel } from "@/lib/season";

function seasonLabel(s: { startYear: number; competitionName: string | null }, seasonCalendar: string): string {
  const base = formatSeasonLabel(s.startYear, seasonCalendar);
  return s.competitionName ? `${base} — ${s.competitionName}` : base;
}

export function SeasonSwitcher({
  squadId,
  seasonCalendar,
  seasons,
  currentSeasonId,
}: {
  squadId: string;
  seasonCalendar: string;
  /** competitionName distingue temporadas do mesmo ano (etapa 10.1, §7/§8 — só acontece com seleção). */
  seasons: { id: string; startYear: number; competitionName: string | null }[];
  currentSeasonId: string;
}) {
  const router = useRouter();
  const byId = new Map(seasons.map((s) => [s.id, s]));

  function handleChange(value: string | null) {
    if (!value || value === currentSeasonId) return;
    router.push(`/squads/${squadId}/seasons/${value}`);
  }

  return (
    <Select value={currentSeasonId} onValueChange={handleChange}>
      <SelectTrigger className="w-auto max-w-40" size="sm">
        <SelectValue>
          {(v: string) => {
            const s = byId.get(v);
            return s ? seasonLabel(s, seasonCalendar) : "";
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {seasons.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {seasonLabel(s, seasonCalendar)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
