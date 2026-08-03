/**
 * Canonical country list for nationality search + flag display (§6/7,
 * etapa 6). `enName` is the canonical stored value — chosen to match the
 * English-language strings the Kaggle dataset already uses (e.g. "Brazil",
 * "Germany"), so existing CachedPlayer.nationality rows keep working
 * without a backfill. `aliases` covers known Kaggle/API quirks that don't
 * match any `name`/`enName` directly (e.g. the dataset says "Holland").
 */
export interface Country {
  enName: string;
  label: string; // pt-BR display label
  iso2: string;
  aliases?: string[];
}

export const COUNTRIES: Country[] = [
  { enName: "Afghanistan", label: "Afeganistão", iso2: "AF" },
  { enName: "Albania", label: "Albânia", iso2: "AL" },
  { enName: "Algeria", label: "Argélia", iso2: "DZ" },
  { enName: "Angola", label: "Angola", iso2: "AO" },
  { enName: "Argentina", label: "Argentina", iso2: "AR" },
  { enName: "Armenia", label: "Armênia", iso2: "AM" },
  { enName: "Australia", label: "Austrália", iso2: "AU" },
  { enName: "Austria", label: "Áustria", iso2: "AT" },
  { enName: "Azerbaijan", label: "Azerbaijão", iso2: "AZ" },
  { enName: "Belgium", label: "Bélgica", iso2: "BE" },
  { enName: "Benin", label: "Benin", iso2: "BJ" },
  { enName: "Bolivia", label: "Bolívia", iso2: "BO" },
  { enName: "Bosnia and Herzegovina", label: "Bósnia e Herzegovina", iso2: "BA", aliases: ["Bosnia-Herzegovina", "Bosnia"] },
  { enName: "Brazil", label: "Brasil", iso2: "BR", aliases: ["Brasil"] },
  { enName: "Bulgaria", label: "Bulgária", iso2: "BG" },
  { enName: "Burkina Faso", label: "Burkina Faso", iso2: "BF" },
  { enName: "Cameroon", label: "Camarões", iso2: "CM" },
  { enName: "Canada", label: "Canadá", iso2: "CA" },
  { enName: "Cape Verde", label: "Cabo Verde", iso2: "CV", aliases: ["Cabo Verde"] },
  { enName: "Central African Republic", label: "República Centro-Africana", iso2: "CF" },
  { enName: "Chad", label: "Chade", iso2: "TD" },
  { enName: "Chile", label: "Chile", iso2: "CL" },
  { enName: "China PR", label: "China", iso2: "CN", aliases: ["China"] },
  { enName: "Colombia", label: "Colômbia", iso2: "CO" },
  { enName: "Congo", label: "Congo", iso2: "CG" },
  { enName: "Congo DR", label: "República Democrática do Congo", iso2: "CD", aliases: ["DR Congo", "Congo-Kinshasa"] },
  { enName: "Costa Rica", label: "Costa Rica", iso2: "CR" },
  { enName: "Croatia", label: "Croácia", iso2: "HR" },
  { enName: "Cuba", label: "Cuba", iso2: "CU" },
  { enName: "Curacao", label: "Curaçao", iso2: "CW", aliases: ["Curaçao"] },
  { enName: "Czech Republic", label: "República Tcheca", iso2: "CZ", aliases: ["Czechia"] },
  { enName: "Denmark", label: "Dinamarca", iso2: "DK" },
  { enName: "Dominican Republic", label: "República Dominicana", iso2: "DO" },
  { enName: "Ecuador", label: "Equador", iso2: "EC" },
  { enName: "Egypt", label: "Egito", iso2: "EG" },
  { enName: "England", label: "Inglaterra", iso2: "GB-ENG" },
  { enName: "Equatorial Guinea", label: "Guiné Equatorial", iso2: "GQ" },
  { enName: "Estonia", label: "Estônia", iso2: "EE" },
  { enName: "Ethiopia", label: "Etiópia", iso2: "ET" },
  { enName: "Finland", label: "Finlândia", iso2: "FI" },
  { enName: "France", label: "França", iso2: "FR" },
  { enName: "Gabon", label: "Gabão", iso2: "GA" },
  { enName: "Gambia", label: "Gâmbia", iso2: "GM" },
  { enName: "Georgia", label: "Geórgia", iso2: "GE" },
  { enName: "Germany", label: "Alemanha", iso2: "DE" },
  { enName: "Ghana", label: "Gana", iso2: "GH" },
  { enName: "Greece", label: "Grécia", iso2: "GR" },
  { enName: "Guinea", label: "Guiné", iso2: "GN" },
  { enName: "Guinea-Bissau", label: "Guiné-Bissau", iso2: "GW" },
  { enName: "Haiti", label: "Haiti", iso2: "HT" },
  { enName: "Honduras", label: "Honduras", iso2: "HN" },
  { enName: "Hungary", label: "Hungria", iso2: "HU" },
  { enName: "Iceland", label: "Islândia", iso2: "IS" },
  { enName: "India", label: "Índia", iso2: "IN" },
  { enName: "Iran", label: "Irã", iso2: "IR" },
  { enName: "Iraq", label: "Iraque", iso2: "IQ" },
  { enName: "Ireland", label: "Irlanda", iso2: "IE", aliases: ["Republic of Ireland"] },
  { enName: "Israel", label: "Israel", iso2: "IL" },
  { enName: "Italy", label: "Itália", iso2: "IT" },
  { enName: "Ivory Coast", label: "Costa do Marfim", iso2: "CI", aliases: ["Côte d'Ivoire"] },
  { enName: "Jamaica", label: "Jamaica", iso2: "JM" },
  { enName: "Japan", label: "Japão", iso2: "JP" },
  { enName: "Kazakhstan", label: "Cazaquistão", iso2: "KZ" },
  { enName: "Kenya", label: "Quênia", iso2: "KE" },
  { enName: "Kosovo", label: "Kosovo", iso2: "XK" },
  { enName: "Latvia", label: "Letônia", iso2: "LV" },
  { enName: "Lebanon", label: "Líbano", iso2: "LB" },
  { enName: "Liberia", label: "Libéria", iso2: "LR" },
  { enName: "Libya", label: "Líbia", iso2: "LY" },
  { enName: "Lithuania", label: "Lituânia", iso2: "LT" },
  { enName: "Luxembourg", label: "Luxemburgo", iso2: "LU" },
  { enName: "Mali", label: "Mali", iso2: "ML" },
  { enName: "Malta", label: "Malta", iso2: "MT" },
  { enName: "Mexico", label: "México", iso2: "MX" },
  { enName: "Moldova", label: "Moldávia", iso2: "MD" },
  { enName: "Montenegro", label: "Montenegro", iso2: "ME" },
  { enName: "Morocco", label: "Marrocos", iso2: "MA" },
  { enName: "Mozambique", label: "Moçambique", iso2: "MZ" },
  { enName: "Netherlands", label: "Países Baixos", iso2: "NL", aliases: ["Holland"] },
  { enName: "New Zealand", label: "Nova Zelândia", iso2: "NZ" },
  { enName: "Nigeria", label: "Nigéria", iso2: "NG" },
  { enName: "North Korea", label: "Coreia do Norte", iso2: "KP" },
  { enName: "North Macedonia", label: "Macedônia do Norte", iso2: "MK", aliases: ["Macedonia"] },
  { enName: "Northern Ireland", label: "Irlanda do Norte", iso2: "GB-NIR" },
  { enName: "Norway", label: "Noruega", iso2: "NO" },
  { enName: "Panama", label: "Panamá", iso2: "PA" },
  { enName: "Paraguay", label: "Paraguai", iso2: "PY" },
  { enName: "Peru", label: "Peru", iso2: "PE" },
  { enName: "Poland", label: "Polônia", iso2: "PL" },
  { enName: "Portugal", label: "Portugal", iso2: "PT" },
  { enName: "Qatar", label: "Catar", iso2: "QA" },
  { enName: "Republic of Ireland", label: "Irlanda", iso2: "IE" },
  { enName: "Romania", label: "Romênia", iso2: "RO" },
  { enName: "Russia", label: "Rússia", iso2: "RU" },
  { enName: "Saudi Arabia", label: "Arábia Saudita", iso2: "SA" },
  { enName: "Scotland", label: "Escócia", iso2: "GB-SCT" },
  { enName: "Senegal", label: "Senegal", iso2: "SN" },
  { enName: "Serbia", label: "Sérvia", iso2: "RS" },
  { enName: "Slovakia", label: "Eslováquia", iso2: "SK" },
  { enName: "Slovenia", label: "Eslovênia", iso2: "SI" },
  { enName: "South Africa", label: "África do Sul", iso2: "ZA" },
  { enName: "South Korea", label: "Coreia do Sul", iso2: "KR", aliases: ["Korea Republic"] },
  { enName: "Spain", label: "Espanha", iso2: "ES" },
  { enName: "Sweden", label: "Suécia", iso2: "SE" },
  { enName: "Switzerland", label: "Suíça", iso2: "CH" },
  { enName: "Syria", label: "Síria", iso2: "SY" },
  { enName: "Tunisia", label: "Tunísia", iso2: "TN" },
  { enName: "Turkey", label: "Turquia", iso2: "TR" },
  { enName: "Uganda", label: "Uganda", iso2: "UG" },
  { enName: "Ukraine", label: "Ucrânia", iso2: "UA" },
  { enName: "United Arab Emirates", label: "Emirados Árabes Unidos", iso2: "AE" },
  { enName: "United States", label: "Estados Unidos", iso2: "US", aliases: ["USA", "United States of America"] },
  { enName: "Uruguay", label: "Uruguai", iso2: "UY" },
  { enName: "Uzbekistan", label: "Uzbequistão", iso2: "UZ" },
  { enName: "Venezuela", label: "Venezuela", iso2: "VE" },
  { enName: "Wales", label: "País de Gales", iso2: "GB-WLS" },
  { enName: "Zambia", label: "Zâmbia", iso2: "ZM" },
  { enName: "Zimbabwe", label: "Zimbábue", iso2: "ZW" },
];

const BY_LOOKUP = new Map<string, Country>();
for (const country of COUNTRIES) {
  BY_LOOKUP.set(country.enName.toLowerCase(), country);
  BY_LOOKUP.set(country.label.toLowerCase(), country);
  for (const alias of country.aliases ?? []) {
    BY_LOOKUP.set(alias.toLowerCase(), country);
  }
}

export function findCountry(nationality?: string | null): Country | undefined {
  if (!nationality) return undefined;
  return BY_LOOKUP.get(nationality.trim().toLowerCase());
}

/**
 * Regional-indicator flag emoji from an ISO 3166-1 alpha-2 code — no image
 * assets needed. The four home-nation "codes" above (GB-ENG etc.) aren't
 * real ISO2 codes and have no regional-indicator flag, so they fall back to
 * their own dedicated unicode flag sequences (already-standard emoji).
 */
const SUBDIVISION_FLAGS: Record<string, string> = {
  "GB-ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "GB-SCT": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "GB-WLS": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "GB-NIR": "🇬🇧",
};

export function flagEmoji(iso2: string): string {
  const subdivision = SUBDIVISION_FLAGS[iso2];
  if (subdivision) return subdivision;
  return iso2
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

/** Flag for a free-text nationality string as already stored on CachedPlayer (e.g. "Brazil", "Holland"). Returns null when unrecognized rather than guessing. */
export function countryFlag(nationality?: string | null): string | null {
  const country = findCountry(nationality);
  return country ? flagEmoji(country.iso2) : null;
}
