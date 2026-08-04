/** 1 posição principal + até este tanto de secundárias (§2, etapa 6). */
export const MAX_SECONDARY_POSITIONS = 3;

/** FIFA-style abbreviations used for custom players (create + edit forms) — see also lib/position-groups.ts and lib/position-category.ts, which read these same abbreviations back out. */
export const POSITIONS = [
  { value: "GK", label: "Goleiro" },
  { value: "CB", label: "Zagueiro" },
  { value: "LB", label: "Lateral esquerdo" },
  { value: "RB", label: "Lateral direito" },
  { value: "LWB", label: "Ala esquerdo" },
  { value: "RWB", label: "Ala direito" },
  { value: "CDM", label: "Volante" },
  { value: "CM", label: "Meio-campo" },
  { value: "CAM", label: "Meia atacante" },
  { value: "LM", label: "Meia esquerdo" },
  { value: "RM", label: "Meia direito" },
  { value: "LW", label: "Ponta esquerda" },
  { value: "RW", label: "Ponta direita" },
  { value: "CF", label: "Segundo atacante" },
  { value: "ST", label: "Atacante" },
];

/**
 * Etapa 9 parte 2 — siglas curtas em português pra listagens compactas
 * (Gerenciamento → Jogadores). Só uma forma alternativa de EXIBIR o mesmo
 * `value` já armazenado (GK/CB/...) — nunca substitui esses valores no
 * banco nem em nenhum outro lugar que já lê POSITIONS acima.
 */
export const POSITION_ABBREVIATIONS_PT: Record<string, string> = {
  GK: "GO",
  CB: "ZAG",
  LB: "LE",
  RB: "LD",
  LWB: "AE",
  RWB: "AD",
  CDM: "VOL",
  CM: "MC",
  CAM: "MEI",
  LM: "ME",
  RM: "MD",
  LW: "PE",
  RW: "PD",
  CF: "SA",
  ST: "ATA",
};
