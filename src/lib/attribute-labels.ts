// Portuguese labels for the Kaggle ratings dataset's attribute columns
// (see kaggle-ratings.normalizer.ts). The six main stats use EA FC's own
// pt-BR abbreviations (PAC/CHU/PAS/DRI/DEF/FÍS).

export const MAIN_ATTRIBUTES: { key: string; label: string }[] = [
  { key: "pac", label: "PAC" },
  { key: "sho", label: "CHU" },
  { key: "pas", label: "PAS" },
  { key: "dri", label: "DRI" },
  { key: "def", label: "DEF" },
  { key: "phy", label: "FÍS" },
];

export const ATTRIBUTE_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "Ataque",
    keys: ["finishing", "shotPower", "longShots", "volleys", "penalties", "positioning"],
  },
  {
    label: "Passe",
    keys: ["shortPassing", "longPassing", "curve", "freeKickAccuracy", "crossing", "vision"],
  },
  {
    label: "Drible",
    keys: ["dribbling", "ballControl", "agility", "balance", "reactions", "composure"],
  },
  {
    label: "Defesa",
    keys: ["interceptions", "defensiveAwareness", "standingTackle", "slidingTackle", "headingAccuracy"],
  },
  { label: "Físico", keys: ["aggression", "jumping", "stamina", "strength"] },
  { label: "Goleiro", keys: ["gkDiving", "gkHandling", "gkKicking", "gkPositioning", "gkReflexes"] },
];

export const ATTRIBUTE_LABELS: Record<string, string> = {
  acceleration: "Aceleração",
  sprintSpeed: "Velocidade",
  finishing: "Finalização",
  shotPower: "Força do Chute",
  longShots: "Chute de Longe",
  volleys: "Voleio",
  penalties: "Pênalti",
  positioning: "Posicionamento",
  shortPassing: "Passe Curto",
  longPassing: "Passe Longo",
  curve: "Efeito",
  freeKickAccuracy: "Falta",
  crossing: "Cruzamento",
  vision: "Visão de Jogo",
  dribbling: "Drible",
  ballControl: "Controle de Bola",
  agility: "Agilidade",
  balance: "Equilíbrio",
  reactions: "Reação",
  composure: "Compostura",
  interceptions: "Interceptação",
  defensiveAwareness: "Marcação",
  standingTackle: "Desarme (Pé)",
  slidingTackle: "Desarme (Carrinho)",
  headingAccuracy: "Cabeceio",
  aggression: "Agressividade",
  jumping: "Impulsão",
  stamina: "Fôlego",
  strength: "Força",
  gkDiving: "Voo",
  gkHandling: "Manejo",
  gkKicking: "Chute",
  gkPositioning: "Posicionamento",
  gkReflexes: "Reflexos",
  skillMoves: "Habilidades",
  weakFootAbility: "Pé Ruim",
};
