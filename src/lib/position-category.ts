import type { PositionCategory } from "./formations";

// Player position strings come from different sources in different shapes:
// Kaggle uses FIFA-style abbreviations (GK, CB, ST...), API-Football/
// TheSportsDB use verbose English words (Goalkeeper, Defender...).
const ABBREVIATION_CATEGORY: Record<string, PositionCategory> = {
  GK: "GK",
  CB: "DEF",
  LB: "DEF",
  RB: "DEF",
  LWB: "DEF",
  RWB: "DEF",
  CDM: "MID",
  CM: "MID",
  CAM: "MID",
  LM: "MID",
  RM: "MID",
  LW: "ATT",
  RW: "ATT",
  CF: "ATT",
  ST: "ATT",
};

export function normalizePositionCategory(position?: string | null): PositionCategory | undefined {
  if (!position) return undefined;

  const abbreviation = ABBREVIATION_CATEGORY[position.toUpperCase()];
  if (abbreviation) return abbreviation;

  const lower = position.toLowerCase();
  if (lower.includes("goalkeeper")) return "GK";
  if (lower.includes("defen")) return "DEF";
  if (lower.includes("midfield")) return "MID";
  if (lower.includes("attack") || lower.includes("forward")) return "ATT";

  return undefined;
}
