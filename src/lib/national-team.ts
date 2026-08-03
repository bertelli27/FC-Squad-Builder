// Only informative where used as a display counter (no hard cap on adding
// players) — but IS enforced as the cutoff for auto-loading a national
// team's roster and for where a manually-added player lands (bench vs.
// extras). Shared between the server (squad.service.ts) and the client
// (squad-editor.tsx) so both agree on the same number.
export const NATIONAL_TEAM_SQUAD_SIZE = 26;
