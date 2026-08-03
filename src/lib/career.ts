export type CareerStintKind = "club" | "nationalTeam";

export const CAREER_STINT_KINDS: { value: CareerStintKind; label: string }[] = [
  { value: "club", label: "Clube" },
  { value: "nationalTeam", label: "Seleção" },
];

export interface StintTotals {
  appearances: number;
  goals: number;
  assists: number;
}

/**
 * A stint's effective jogos/gols/assistências — always computed, never a
 * value written anywhere itself (§4 etapa 5: "não quero digitar o total
 * manualmente"). Club stints (kind="club") keep the flat fields filled in
 * by hand since etapa 4; national-team stints (kind="nationalTeam") are
 * always the sum of their per-competition rows instead — same principle
 * as Season.wins/draws/losses → partidas and PlayerCompetitionStats →
 * total, just applied to CareerStint/CareerStintCompetitionStats.
 */
export function stintTotals(stint: {
  kind: string;
  appearances: number;
  goals: number;
  assists: number;
  competitionStats?: StintTotals[];
}): StintTotals {
  if (stint.kind === "nationalTeam") {
    return (stint.competitionStats ?? []).reduce(
      (acc, s) => ({
        appearances: acc.appearances + s.appearances,
        goals: acc.goals + s.goals,
        assists: acc.assists + s.assists,
      }),
      { appearances: 0, goals: 0, assists: 0 },
    );
  }
  return { appearances: stint.appearances, goals: stint.goals, assists: stint.assists };
}
