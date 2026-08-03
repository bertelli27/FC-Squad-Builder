import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; seasonId: string }> };

// undefined = field not sent, leave untouched; "" or null = clear it.
function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
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
  const coachName = optionalStringField(body?.coachName);
  const coachPhotoUrl = optionalStringField(body?.coachPhotoUrl);
  const coachExternalLink = optionalStringField(body?.coachExternalLink);
  const notes = optionalStringField(body?.notes);

  if (
    coachName !== undefined ||
    coachPhotoUrl !== undefined ||
    coachExternalLink !== undefined ||
    notes !== undefined
  ) {
    await seasonService.updateSeason(seasonId, { coachName, coachPhotoUrl, coachExternalLink, notes });
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
