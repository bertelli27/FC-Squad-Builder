export type PositionCategory = "GK" | "DEF" | "MID" | "ATT";

export interface FormationSlot {
  /** Unique within a formation, stored as SquadPlayer.positionSlot. */
  slot: string;
  label: string;
  category: PositionCategory;
  /** Percent position on the pitch, 0 = own goal line, 100 = opponent's. */
  x: number;
  y: number;
}

// y is inverted (100 = own goal / bottom of the pitch) so slots read
// top-to-bottom as attack-to-defense, matching how the pitch is rendered.
export const FORMATIONS: Record<string, FormationSlot[]> = {
  "4-3-3": [
    { slot: "GK", label: "GK", category: "GK", x: 50, y: 92 },
    { slot: "LB", label: "LB", category: "DEF", x: 15, y: 72 },
    { slot: "CB1", label: "CB", category: "DEF", x: 35, y: 78 },
    { slot: "CB2", label: "CB", category: "DEF", x: 65, y: 78 },
    { slot: "RB", label: "RB", category: "DEF", x: 85, y: 72 },
    { slot: "CM1", label: "CM", category: "MID", x: 30, y: 50 },
    { slot: "CM2", label: "CM", category: "MID", x: 50, y: 55 },
    { slot: "CM3", label: "CM", category: "MID", x: 70, y: 50 },
    { slot: "LW", label: "LW", category: "ATT", x: 15, y: 20 },
    { slot: "ST", label: "ST", category: "ATT", x: 50, y: 12 },
    { slot: "RW", label: "RW", category: "ATT", x: 85, y: 20 },
  ],
  "4-4-2": [
    { slot: "GK", label: "GK", category: "GK", x: 50, y: 92 },
    { slot: "LB", label: "LB", category: "DEF", x: 15, y: 72 },
    { slot: "CB1", label: "CB", category: "DEF", x: 35, y: 78 },
    { slot: "CB2", label: "CB", category: "DEF", x: 65, y: 78 },
    { slot: "RB", label: "RB", category: "DEF", x: 85, y: 72 },
    { slot: "LM", label: "LM", category: "MID", x: 15, y: 45 },
    { slot: "CM1", label: "CM", category: "MID", x: 38, y: 50 },
    { slot: "CM2", label: "CM", category: "MID", x: 62, y: 50 },
    { slot: "RM", label: "RM", category: "MID", x: 85, y: 45 },
    { slot: "ST1", label: "ST", category: "ATT", x: 35, y: 15 },
    { slot: "ST2", label: "ST", category: "ATT", x: 65, y: 15 },
  ],
  "4-2-3-1": [
    { slot: "GK", label: "GK", category: "GK", x: 50, y: 92 },
    { slot: "LB", label: "LB", category: "DEF", x: 15, y: 72 },
    { slot: "CB1", label: "CB", category: "DEF", x: 35, y: 78 },
    { slot: "CB2", label: "CB", category: "DEF", x: 65, y: 78 },
    { slot: "RB", label: "RB", category: "DEF", x: 85, y: 72 },
    { slot: "CDM1", label: "CDM", category: "MID", x: 35, y: 58 },
    { slot: "CDM2", label: "CDM", category: "MID", x: 65, y: 58 },
    { slot: "LAM", label: "LM", category: "MID", x: 20, y: 35 },
    { slot: "CAM", label: "CAM", category: "MID", x: 50, y: 32 },
    { slot: "RAM", label: "RM", category: "MID", x: 80, y: 35 },
    { slot: "ST", label: "ST", category: "ATT", x: 50, y: 12 },
  ],
  "3-5-2": [
    { slot: "GK", label: "GK", category: "GK", x: 50, y: 92 },
    { slot: "CB1", label: "CB", category: "DEF", x: 30, y: 76 },
    { slot: "CB2", label: "CB", category: "DEF", x: 50, y: 80 },
    { slot: "CB3", label: "CB", category: "DEF", x: 70, y: 76 },
    { slot: "LM", label: "LWB", category: "MID", x: 10, y: 45 },
    { slot: "CM1", label: "CM", category: "MID", x: 33, y: 52 },
    { slot: "CM2", label: "CM", category: "MID", x: 50, y: 55 },
    { slot: "CM3", label: "CM", category: "MID", x: 67, y: 52 },
    { slot: "RM", label: "RWB", category: "MID", x: 90, y: 45 },
    { slot: "ST1", label: "ST", category: "ATT", x: 35, y: 15 },
    { slot: "ST2", label: "ST", category: "ATT", x: 65, y: 15 },
  ],
  "4-1-4-1": [
    { slot: "GK", label: "GK", category: "GK", x: 50, y: 92 },
    { slot: "LB", label: "LB", category: "DEF", x: 15, y: 72 },
    { slot: "CB1", label: "CB", category: "DEF", x: 35, y: 78 },
    { slot: "CB2", label: "CB", category: "DEF", x: 65, y: 78 },
    { slot: "RB", label: "RB", category: "DEF", x: 85, y: 72 },
    { slot: "CDM", label: "CDM", category: "MID", x: 50, y: 60 },
    { slot: "LM", label: "LM", category: "MID", x: 15, y: 40 },
    { slot: "CM1", label: "CM", category: "MID", x: 38, y: 42 },
    { slot: "CM2", label: "CM", category: "MID", x: 62, y: 42 },
    { slot: "RM", label: "RM", category: "MID", x: 85, y: 40 },
    { slot: "ST", label: "ST", category: "ATT", x: 50, y: 12 },
  ],
  "3-4-3": [
    { slot: "GK", label: "GK", category: "GK", x: 50, y: 92 },
    { slot: "CB1", label: "CB", category: "DEF", x: 30, y: 76 },
    { slot: "CB2", label: "CB", category: "DEF", x: 50, y: 80 },
    { slot: "CB3", label: "CB", category: "DEF", x: 70, y: 76 },
    { slot: "LM", label: "LM", category: "MID", x: 12, y: 48 },
    { slot: "CM1", label: "CM", category: "MID", x: 38, y: 52 },
    { slot: "CM2", label: "CM", category: "MID", x: 62, y: 52 },
    { slot: "RM", label: "RM", category: "MID", x: 88, y: 48 },
    { slot: "LW", label: "LW", category: "ATT", x: 20, y: 15 },
    { slot: "ST", label: "ST", category: "ATT", x: 50, y: 10 },
    { slot: "RW", label: "RW", category: "ATT", x: 80, y: 15 },
  ],
  "5-3-2": [
    { slot: "GK", label: "GK", category: "GK", x: 50, y: 92 },
    { slot: "LWB", label: "LWB", category: "DEF", x: 10, y: 68 },
    { slot: "CB1", label: "CB", category: "DEF", x: 30, y: 78 },
    { slot: "CB2", label: "CB", category: "DEF", x: 50, y: 82 },
    { slot: "CB3", label: "CB", category: "DEF", x: 70, y: 78 },
    { slot: "RWB", label: "RWB", category: "DEF", x: 90, y: 68 },
    { slot: "CM1", label: "CM", category: "MID", x: 30, y: 48 },
    { slot: "CM2", label: "CM", category: "MID", x: 50, y: 52 },
    { slot: "CM3", label: "CM", category: "MID", x: 70, y: 48 },
    { slot: "ST1", label: "ST", category: "ATT", x: 35, y: 15 },
    { slot: "ST2", label: "ST", category: "ATT", x: 65, y: 15 },
  ],
};

export function getFormationSlots(formation: string): FormationSlot[] {
  return FORMATIONS[formation] ?? FORMATIONS["4-3-3"];
}
