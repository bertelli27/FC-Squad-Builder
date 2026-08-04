import { NextResponse, type NextRequest } from "next/server";
import { coachService } from "@/services/coach.service";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const coaches = await coachService.listCoaches(query);
  return NextResponse.json({ coaches });
}

/** Plain create — used by EditSeasonCoachDialog's "+ Novo técnico". Squad import uses findOrCreateCoach directly (see squad-transfer.service.ts), not this route. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }

  const coach = await coachService.createCoach(
    body.name,
    typeof body.photoUrl === "string" ? body.photoUrl : undefined,
    typeof body.externalLink === "string" ? body.externalLink : undefined,
  );
  return NextResponse.json({ coach }, { status: 201 });
}
