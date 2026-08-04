import { NextResponse, type NextRequest } from "next/server";
import { competitionService } from "@/services/competition.service";

type RouteContext = { params: Promise<{ id: string; championId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { championId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const year = typeof body.year === "number" && Number.isInteger(body.year) ? body.year : undefined;
  const seasonId = body.seasonId === null ? null : typeof body.seasonId === "string" ? body.seasonId : undefined;
  const standaloneName = typeof body.standaloneName === "string" && body.standaloneName.trim() ? body.standaloneName : undefined;
  const standaloneLogoUrl =
    body.standaloneLogoUrl === undefined
      ? undefined
      : body.standaloneLogoUrl === null || body.standaloneLogoUrl === ""
        ? null
        : typeof body.standaloneLogoUrl === "string"
          ? body.standaloneLogoUrl
          : undefined;
  const standaloneCountry =
    body.standaloneCountry === undefined
      ? undefined
      : body.standaloneCountry === null || body.standaloneCountry === ""
        ? null
        : typeof body.standaloneCountry === "string"
          ? body.standaloneCountry
          : undefined;

  const champion = await competitionService.updateChampion(championId, {
    year,
    seasonId,
    standaloneName,
    standaloneLogoUrl,
    standaloneCountry,
  });
  if (!champion) {
    return NextResponse.json({ error: "Could not update champion (year may already be registered)" }, { status: 409 });
  }
  return NextResponse.json({ champion });
}

/** §51: só remove o registro do histórico — nunca o clube/seleção/elenco vinculado. */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { championId } = await params;
  await competitionService.removeChampion(championId);
  return new NextResponse(null, { status: 204 });
}
