import { NextResponse, type NextRequest } from "next/server";
import { theSportsDbPlayerProvider } from "@/services/providers/thesportsdb.provider";

// Live search against TheSportsDB, for finding a player who isn't in the
// Kaggle catalog (npm run import:ratings' ~16k players) or in any club/
// national-team roster already loaded.
//
// API-Football's own free-text player search (apiFootballPlayerProvider.
// searchPlayers) is deliberately NOT called here: as of this writing its
// free tier rejects any `/players?search=` request that isn't also scoped
// by `team` or `league` ("The League or Team field is required with the
// Search field"), for single- and multi-word queries alike. There's no
// team/league to scope by in a generic name search, so every such call
// fails 100% of the time — verified directly against the live API. Since
// it's rate-limited to 100 requests/day, calling it here would only burn
// quota for a guaranteed-empty result.
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  if (!name || name.trim().length < 3) {
    return NextResponse.json(
      { error: "'name' must be at least 3 characters" },
      { status: 400 },
    );
  }

  const players = await theSportsDbPlayerProvider.searchPlayers({ name }).catch(() => []);
  return NextResponse.json({ players });
}
