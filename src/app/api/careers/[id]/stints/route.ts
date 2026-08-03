import { NextResponse, type NextRequest } from "next/server";
import { careerService } from "@/services/career.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const kind = body?.kind === "nationalTeam" ? "nationalTeam" : "club";
  const seasonId = typeof body?.seasonId === "string" ? body.seasonId : undefined;
  const clubName = typeof body?.clubName === "string" ? body.clubName : undefined;
  const clubLogoUrl = typeof body?.clubLogoUrl === "string" ? body.clubLogoUrl : undefined;
  const startYear = typeof body?.startYear === "number" ? body.startYear : undefined;
  const calendar = body?.calendar === "europeu" ? "europeu" : body?.calendar === "brasileiro" ? "brasileiro" : undefined;

  if (!seasonId && (!clubName?.trim() || startYear === undefined)) {
    return NextResponse.json(
      { error: "Provide 'seasonId', or both 'clubName' and 'startYear'" },
      { status: 400 },
    );
  }

  const stint = await careerService.addStint(id, { kind, seasonId, clubName, clubLogoUrl, startYear, calendar });
  if (!stint) return NextResponse.json({ error: "Could not create stint" }, { status: 400 });

  return NextResponse.json({ stint }, { status: 201 });
}
