/**
 * Etapa 10.3 (§25) — "Você quis dizer este clube?" antes de criar um clube
 * novo com nome parecido a um já cadastrado. Distância de Levenshtein
 * normalizada (0 = idênticas, 1 = totalmente diferentes), comparando texto
 * normalizado (minúsculas, sem acento, espaços colapsados) pra que
 * "BORUSSIA DORTMUND" e "Borussia Dortmund" fiquem a distância 0.
 */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, (_, i) => [i, ...Array(cols - 1).fill(0)]);
  for (let j = 1; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  return dist[rows - 1][cols - 1];
}

export function similarity(a: string, b: string): number {
  const [na, nb] = [normalize(a), normalize(b)];
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  // Uma string contida na outra (ex: "Borussia D." dentro de "Borussia
  // Dortmund") conta como bem parecida mesmo com a distância bruta alta.
  const containment = na.includes(nb) || nb.includes(na) ? 0.85 : 0;
  return Math.max(containment, 1 - levenshtein(na, nb) / maxLen);
}

/** Candidatos com similaridade >= threshold ao `query`, ordenados do mais parecido pro menos. */
export function findSimilarNames<T extends { name: string }>(
  query: string,
  candidates: T[],
  threshold = 0.6,
): T[] {
  if (!query.trim()) return [];
  return candidates
    .map((c) => ({ candidate: c, score: similarity(query, c.name) }))
    .filter((c) => c.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c) => c.candidate);
}
