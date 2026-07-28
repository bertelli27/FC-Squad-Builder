import type { Player } from "@/types/domain";

export const KAGGLE_RATINGS_SOURCE = "kaggle-fc26";

// Raw row shape as parsed from ea_fc26_players.csv (see data/README or the
// Kaggle dataset "EA Sports FC 26 Player Ratings" for column definitions).
export interface KaggleRatingsRow {
  id: string;
  rank: string;
  overallRating: string;
  firstName: string;
  lastName: string;
  commonName: string;
  birthdate: string;
  height: string;
  weight: string;
  skillMoves: string;
  weakFootAbility: string;
  preferredFoot: string;
  position: string;
  positionType: string;
  alternatePositions: string;
  nationality: string;
  team: string;
  leagueName: string;
  playStyles: string;
  playStylesPlus: string;
  [attribute: string]: string;
}

const ATTRIBUTE_COLUMNS = [
  "pac",
  "sho",
  "pas",
  "dri",
  "def",
  "phy",
  "acceleration",
  "sprintSpeed",
  "finishing",
  "shotPower",
  "longShots",
  "volleys",
  "penalties",
  "positioning",
  "shortPassing",
  "longPassing",
  "curve",
  "freeKickAccuracy",
  "crossing",
  "vision",
  "dribbling",
  "ballControl",
  "agility",
  "balance",
  "reactions",
  "composure",
  "interceptions",
  "defensiveAwareness",
  "standingTackle",
  "slidingTackle",
  "headingAccuracy",
  "aggression",
  "jumping",
  "stamina",
  "strength",
  "gkDiving",
  "gkHandling",
  "gkKicking",
  "gkPositioning",
  "gkReflexes",
  "skillMoves",
  "weakFootAbility",
] as const;

function parseAge(birthdate: string): number | undefined {
  // Format: "6/15/1992 12:00:00 AM"
  const datePart = birthdate.split(" ")[0];
  const [month, day, year] = datePart.split("/").map(Number);
  if (!month || !day || !year) return undefined;

  const birth = new Date(year, month - 1, day);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export function normalizeKaggleRatingsRow(row: KaggleRatingsRow): Player {
  const attributes: Record<string, number> = {};
  for (const column of ATTRIBUTE_COLUMNS) {
    const value = toNumber(row[column]);
    if (value !== undefined) attributes[column] = value;
  }

  return {
    id: `${KAGGLE_RATINGS_SOURCE}:${row.id}`,
    source: KAGGLE_RATINGS_SOURCE,
    externalId: row.id,
    name: row.commonName || `${row.firstName} ${row.lastName}`.trim(),
    nationality: row.nationality || undefined,
    position: row.position || undefined,
    club: row.team || undefined,
    league: row.leagueName || undefined,
    overall: toNumber(row.overallRating),
    // Not present in this dataset (base FC26 live-service ratings have no
    // career-mode "potential"); left undefined until a source provides it.
    potential: undefined,
    age: parseAge(row.birthdate),
    attributes,
  };
}
