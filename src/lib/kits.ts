/**
 * Etapa 9 parte 3 — tipos fixos de minikit (estilo EA FC/FIFA) que uma
 * temporada pode ter. Nenhum é obrigatório; uma temporada pode ter
 * qualquer subconjunto (inclusive nenhum). Ver SeasonKit no schema.
 */
/** Etapa 9 parte 4 (§7) — ordem visual: Goleiro primeiro, depois Home/Away/Third/Fourth. Só ordem de exibição — não afeta dado nenhum já salvo. */
export const KIT_TYPES = [
  { value: "goalkeeper", label: "Goleiro" },
  { value: "home", label: "Home" },
  { value: "away", label: "Away" },
  { value: "third", label: "Third" },
  { value: "fourth", label: "Fourth" },
] as const;

export type KitType = (typeof KIT_TYPES)[number]["value"];

export const KIT_TYPE_VALUES = KIT_TYPES.map((k) => k.value);

export function isKitType(value: unknown): value is KitType {
  return typeof value === "string" && (KIT_TYPE_VALUES as string[]).includes(value);
}

export function kitTypeLabel(type: string): string {
  return KIT_TYPES.find((k) => k.value === type)?.label ?? type;
}
