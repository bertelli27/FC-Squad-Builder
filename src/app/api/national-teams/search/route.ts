import { NextResponse, type NextRequest } from "next/server";
import { nationalTeamDataService } from "@/services/national-team-data.service";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing 'q' query parameter" }, { status: 400 });
  }

  const nationalTeams = await nationalTeamDataService.searchNationalTeams(query);
  return NextResponse.json({ nationalTeams });
}
