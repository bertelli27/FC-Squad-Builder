export type PositionGroup =
  | "Goleiros"
  | "Zagueiros"
  | "Laterais"
  | "Meio-campistas"
  | "Atacantes"
  | "Outros";

export const GROUP_ORDER: PositionGroup[] = [
  "Goleiros",
  "Zagueiros",
  "Laterais",
  "Meio-campistas",
  "Atacantes",
  "Outros",
];

// Finer-grained than position-category.ts's GK/DEF/MID/ATT (which exists
// to fill formation slots): this splits defenders into zagueiros/laterais
// for a more scannable bench list. Only works precisely for sources with
// FIFA-style abbreviations (Kaggle, custom players); API-Football's
// squads endpoint only returns broad English words ("Defender"), which
// can't distinguish CB from LB, so those fall into "Zagueiros" as a
// reasonable default rather than being split correctly.
const ABBREVIATION_GROUP: Record<string, PositionGroup> = {
  GK: "Goleiros",
  CB: "Zagueiros",
  LB: "Laterais",
  RB: "Laterais",
  LWB: "Laterais",
  RWB: "Laterais",
  CDM: "Meio-campistas",
  CM: "Meio-campistas",
  CAM: "Meio-campistas",
  LM: "Meio-campistas",
  RM: "Meio-campistas",
  LW: "Atacantes",
  RW: "Atacantes",
  CF: "Atacantes",
  ST: "Atacantes",
};

export function positionGroup(position?: string | null): PositionGroup {
  if (!position) return "Outros";

  const exact = ABBREVIATION_GROUP[position.toUpperCase()];
  if (exact) return exact;

  const lower = position.toLowerCase();
  if (lower.includes("goalkeeper")) return "Goleiros";
  // Checked before the generic "back"/"defen" match below: "Centre-Back"
  // also contains "back" but is a zagueiro, not a lateral.
  if (lower.includes("left-back") || lower.includes("right-back") || lower.includes("wing-back")) {
    return "Laterais";
  }
  if (lower.includes("defen") || lower.includes("back")) return "Zagueiros";
  if (lower.includes("midfield")) return "Meio-campistas";
  if (lower.includes("attack") || lower.includes("forward") || lower.includes("wing")) {
    return "Atacantes";
  }
  return "Outros";
}

export function groupPlayersByPosition<T extends { position?: string | null }>(
  players: T[],
): { group: PositionGroup; players: T[] }[] {
  const buckets = new Map<PositionGroup, T[]>();
  for (const player of players) {
    const group = positionGroup(player.position);
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group)!.push(player);
  }
  return GROUP_ORDER.filter((g) => buckets.has(g)).map((group) => ({
    group,
    players: buckets.get(group)!,
  }));
}
