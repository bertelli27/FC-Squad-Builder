import type { SeasonCalendar } from "./season";

function ageAt(dateOfBirth: Date, reference: Date): number {
  let age = reference.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthday =
    reference.getMonth() > dateOfBirth.getMonth() ||
    (reference.getMonth() === dateOfBirth.getMonth() && reference.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthday) age -= 1;
  return age;
}

/** Age today, from a stored date of birth. */
export function ageToday(dateOfBirth: Date | string): number {
  return ageAt(new Date(dateOfBirth), new Date());
}

/**
 * Age "as of" a given season — §5: a player's age should evolve per
 * temporada, not be a fixed stored number. Since Season only stores a
 * `startYear` (no month/day precision), a fixed mid-season reference date
 * is used per calendar type rather than the season's literal start instant,
 * to avoid off-by-one surprises right around a player's birthday:
 * "brasileiro" (Jan–Dec) references July 1st of startYear; "europeu"
 * (Aug–May) references January 1st of startYear+1, the midpoint of each
 * calendar's real span.
 */
export function ageAtSeason(
  dateOfBirth: Date | string,
  startYear: number,
  calendar: string | SeasonCalendar,
): number {
  const reference =
    calendar === "europeu" ? new Date(startYear + 1, 0, 1) : new Date(startYear, 6, 1);
  return ageAt(new Date(dateOfBirth), reference);
}
