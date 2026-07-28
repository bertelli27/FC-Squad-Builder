const BASE_URL = "https://v3.football.api-sports.io";

type QueryParams = Record<string, string | number | boolean | undefined>;

function hasErrors(errors: unknown): boolean {
  if (Array.isArray(errors)) return errors.length > 0;
  if (errors && typeof errors === "object") return Object.keys(errors).length > 0;
  return false;
}

export async function apiFootballGet<T>(path: string, params: QueryParams = {}): Promise<T> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) throw new Error("API_FOOTBALL_KEY is not set");

  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
  if (!res.ok) {
    throw new Error(`API-Football request failed: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { errors: unknown; response: T };
  if (hasErrors(json.errors)) {
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
  }

  return json.response;
}
