/**
 * Etapa 9 parte 2 — vocabulário fixo pra classificação de competições em 4
 * níveis (Tipo → Abrangência → Organização → País). Nada disso é uma
 * entidade de banco própria (ver comentário em Competition.organizer no
 * schema) — são só listas fixas que os formulários/listagem usam pra
 * montar selects e agrupar a listagem de forma consistente.
 */

export const KIND_OPTIONS = [
  { value: "club", label: "🏟️ Clube" },
  { value: "nationalTeam", label: "🌎 Seleção" },
] as const;

export type CompetitionKind = (typeof KIND_OPTIONS)[number]["value"];

/** "Nacional" só existe pra clube — uma seleção não tem abrangência nacional (ela É a nação). */
export const SCOPE_OPTIONS_BY_KIND: Record<CompetitionKind, { value: string; label: string }[]> = {
  nationalTeam: [
    { value: "world", label: "🌐 Mundial" },
    { value: "continental", label: "🌍 Continental" },
  ],
  club: [
    { value: "world", label: "🌐 Mundial" },
    { value: "continental", label: "🌍 Continental" },
    { value: "national", label: "🇧🇷 Nacional" },
  ],
};

export const SCOPE_LABELS: Record<string, string> = {
  world: "🌐 Mundial",
  continental: "🌍 Continental",
  national: "🇧🇷 Nacional",
};

/** Confederações — únicas opções válidas de `organizer` quando scope === "continental", pra qualquer Tipo. */
export const CONFEDERATIONS = ["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"];

/** scope === "world" só tem uma organização possível, então nem precisa de select. */
export const WORLD_ORGANIZER = "FIFA";
