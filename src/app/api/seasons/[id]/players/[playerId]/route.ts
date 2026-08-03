import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

// Cadastral fields (name/position/photo/etc.) moved to the central
// PATCH /api/players/[id] (etapa 6, §16/§24/§27) — this route stays
// squad-scoped, for the fields that only make sense within one season's
// roster (shirt number, captaincy).
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, playerId } = await params;
  const body = await request.json().catch(() => null);

  const shirtNumber =
    body?.shirtNumber === null || typeof body?.shirtNumber === "number"
      ? body.shirtNumber
      : undefined;
  const isCaptain = typeof body?.isCaptain === "boolean" ? body.isCaptain : undefined;

  if (shirtNumber === undefined && isCaptain === undefined) {
    return NextResponse.json({ error: "Provide 'shirtNumber' and/or 'isCaptain'" }, { status: 400 });
  }

  await seasonService.updateSeasonPlayer(id, playerId, { shirtNumber, isCaptain });

  const player = await seasonService.getSeasonPlayer(id, playerId);
  return NextResponse.json({ player });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, playerId } = await params;
  await seasonService.removePlayerFromSeason(id, playerId);
  return new NextResponse(null, { status: 204 });
}
