import { NextResponse, type NextRequest } from "next/server";
import { playerDataService } from "@/services/player-data.service";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const name = params.get("name");
  if (!name) {
    return NextResponse.json({ error: "Missing 'name' query parameter" }, { status: 400 });
  }

  const club = params.get("club") ?? undefined;
  const player = await playerDataService.enrichPlayer(name, { club });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  return NextResponse.json({ player });
}
