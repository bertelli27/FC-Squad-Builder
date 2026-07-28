import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, playerId } = await params;
  const body = await request.json().catch(() => null);

  const shirtNumber =
    body?.shirtNumber === null || typeof body?.shirtNumber === "number"
      ? body.shirtNumber
      : undefined;
  const isCaptain = typeof body?.isCaptain === "boolean" ? body.isCaptain : undefined;

  if (shirtNumber === undefined && isCaptain === undefined) {
    return NextResponse.json(
      { error: "Provide 'shirtNumber' and/or 'isCaptain'" },
      { status: 400 },
    );
  }

  const player = await squadService.updateSquadPlayer(id, playerId, { shirtNumber, isCaptain });
  return NextResponse.json({ player });
}
