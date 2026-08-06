export type SeasonCalendar = "brasileiro" | "europeu";

export const SEASON_CALENDARS: { value: SeasonCalendar; label: string }[] = [
  { value: "brasileiro", label: "Brasileiro" },
  { value: "europeu", label: "Europeu" },
];

/**
 * "2026" for calendário brasileiro, "26/27" for europeu — `startYear` is
 * always the first calendar year of the season regardless of type, so
 * sorting/creating a new season never needs to know which format is in
 * use, only the display label does.
 */
export function formatSeasonLabel(startYear: number, calendar: string): string {
  if (calendar === "europeu") {
    return `${String(startYear).slice(-2)}/${String(startYear + 1).slice(-2)}`;
  }
  return String(startYear);
}

/**
 * "Partidas" is never stored on its own — it's always wins+draws+losses,
 * so "partidas ≠ vitórias+empates+derrotas" can't happen (see
 * schema.prisma's comment on Season.wins).
 */
export function matchesPlayed(perf: { wins: number; draws: number; losses: number }): number {
  return perf.wins + perf.draws + perf.losses;
}

/**
 * "R$ 10.000.000,00" / "-R$ 500.000,00" — formatação monetária brasileira
 * (etapa 9 parte 4, §6): pt-BR, símbolo R$, separador de milhar "." e
 * decimal ",". Todo valor de transferência (Transfer.value/
 * CareerTransfer.value) passa por aqui — nunca formatado ad-hoc em cada
 * componente.
 */
export function formatMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
}
