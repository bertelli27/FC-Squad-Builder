import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const seasons = await seasonService.listSeasons(id);
  return NextResponse.json({ seasons });
}

/**
 * Creates a new season for this club — blank, or based on another season
 * of the same club via `duplicateFromSeasonId` (§6 "duplicar temporada").
 * `startYear` is always required and must be unique per club (two seasons
 * for the same year would be ambiguous either way the club labels them).
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const startYear = Number(body?.startYear);
  if (!Number.isInteger(startYear)) {
    return NextResponse.json({ error: "'startYear' must be an integer" }, { status: 400 });
  }

  const duplicateFromSeasonId =
    typeof body?.duplicateFromSeasonId === "string" ? body.duplicateFromSeasonId : undefined;

  const result = await seasonService.createSeason(id, { startYear, duplicateFromSeasonId });

  if ("error" in result) {
    const message =
      result.error === "duplicate-year"
        ? "Já existe uma temporada com esse ano neste clube."
        : "Temporada de origem não encontrada.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ season: result.season }, { status: 201 });
}
