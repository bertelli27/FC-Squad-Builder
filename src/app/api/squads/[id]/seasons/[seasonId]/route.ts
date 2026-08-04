import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; seasonId: string }> };

// undefined = field not sent, leave untouched; "" or null = clear it.
function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

// undefined = field not sent, leave untouched. Negative numbers make no
// sense for a match tally, so they're rejected the same as a non-number.
function nonNegativeIntField(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { seasonId } = await params;
  const season = await seasonService.getSeason(seasonId);
  if (!season) return NextResponse.json({ error: "Season not found" }, { status: 404 });
  return NextResponse.json({ season });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { seasonId } = await params;
  const existing = await seasonService.getSeason(seasonId);
  if (!existing) return NextResponse.json({ error: "Season not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const formation = typeof body?.formation === "string" ? body.formation : undefined;
  const coachId = optionalStringField(body?.coachId);
  const notes = optionalStringField(body?.notes);
  const wins = nonNegativeIntField(body?.wins);
  const draws = nonNegativeIntField(body?.draws);
  const losses = nonNegativeIntField(body?.losses);

  if (coachId !== undefined || notes !== undefined || wins !== undefined || draws !== undefined || losses !== undefined) {
    await seasonService.updateSeason(seasonId, {
      coachId,
      notes,
      wins,
      draws,
      losses,
    });
  }

  // Changing formation remaps the starting XI onto the new slot set
  // (see seasonService.changeFormation), not just a plain field update.
  const season =
    formation !== undefined && formation !== existing.formation
      ? await seasonService.changeFormation(seasonId, formation)
      : await seasonService.getSeason(seasonId);

  return NextResponse.json({ season });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { seasonId } = await params;
  await seasonService.deleteSeason(seasonId);
  return new NextResponse(null, { status: 204 });
}
