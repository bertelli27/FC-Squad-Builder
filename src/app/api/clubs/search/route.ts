import { NextResponse, type NextRequest } from "next/server";
import { clubDataService } from "@/services/club-data.service";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing 'q' query parameter" }, { status: 400 });
  }

  const clubs = await clubDataService.searchClubs(query);
  return NextResponse.json({ clubs });
}
