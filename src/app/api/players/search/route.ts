import { NextResponse, type NextRequest } from "next/server";
import { playerDataService } from "@/services/player-data.service";
import type { PlayerSearchFilters } from "@/services/providers/provider.interface";

function numberOrUndefined(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters: PlayerSearchFilters = {
    name: params.get("name") ?? undefined,
    position: params.get("position") ?? undefined,
    nationality: params.get("nationality") ?? undefined,
    club: params.get("club") ?? undefined,
    league: params.get("league") ?? undefined,
    minOverall: numberOrUndefined(params.get("minOverall")),
    maxOverall: numberOrUndefined(params.get("maxOverall")),
    minPotential: numberOrUndefined(params.get("minPotential")),
    maxPotential: numberOrUndefined(params.get("maxPotential")),
    minAge: numberOrUndefined(params.get("minAge")),
    maxAge: numberOrUndefined(params.get("maxAge")),
  };

  const players = await playerDataService.searchPlayers(filters);
  return NextResponse.json({ players });
}
