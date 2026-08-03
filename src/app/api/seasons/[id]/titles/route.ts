import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const competitionId = typeof body?.competitionId === "string" ? body.competitionId : undefined;
  const competitionName = typeof body?.competitionName === "string" ? body.competitionName : undefined;
  if (!competitionId && !competitionName?.trim()) {
    return NextResponse.json(
      { error: "'competitionId' or 'competitionName' is required" },
      { status: 400 },
    );
  }

  const trophyImageUrl = typeof body?.trophyImageUrl === "string" ? body.trophyImageUrl : undefined;

  const title = await seasonService.addTitle(id, { competitionId, competitionName, trophyImageUrl });
  if (!title) return NextResponse.json({ error: "Could not resolve competition" }, { status: 400 });

  return NextResponse.json({ title }, { status: 201 });
}
