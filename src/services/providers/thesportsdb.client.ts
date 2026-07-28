// "3" is TheSportsDB's public free test key (documented at thesportsdb.com/api.php).
// A premium key (THESPORTSDB_KEY) unlocks higher rate limits but isn't required.
const DEFAULT_KEY = "3";

type QueryParams = Record<string, string | number | undefined>;

export async function theSportsDbGet<T>(path: string, params: QueryParams = {}): Promise<T> {
  const apiKey = process.env.THESPORTSDB_KEY || DEFAULT_KEY;
  const url = new URL(`https://www.thesportsdb.com/api/v1/json/${apiKey}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TheSportsDB request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}
