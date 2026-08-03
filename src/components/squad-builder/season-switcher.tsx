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

export function SeasonSwitcher({
  squadId,
  seasonCalendar,
  seasons,
  currentSeasonId,
}: {
  squadId: string;
  seasonCalendar: string;
  seasons: { id: string; startYear: number }[];
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
      <SelectTrigger className="w-24" size="sm">
        <SelectValue>{(v: string) => formatSeasonLabel(byId.get(v)?.startYear ?? 0, seasonCalendar)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {seasons.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {formatSeasonLabel(s.startYear, seasonCalendar)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
