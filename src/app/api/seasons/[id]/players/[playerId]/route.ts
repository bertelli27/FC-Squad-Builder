import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

// undefined = field not sent, leave untouched; null = clear it (only
// meaningful for the optional custom-player detail fields).
function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, playerId } = await params;
  const body = await request.json().catch(() => null);

  const shirtNumber =
    body?.shirtNumber === null || typeof body?.shirtNumber === "number"
      ? body.shirtNumber
      : undefined;
  const isCaptain = typeof body?.isCaptain === "boolean" ? body.isCaptain : undefined;

  const name = typeof body?.name === "string" && body.name.trim() ? body.name : undefined;
  const position = optionalStringField(body?.position);
  const photoUrl = optionalStringField(body?.photoUrl);
  const externalLink = optionalStringField(body?.externalLink);
  const hasDetailFields =
    name !== undefined ||
    position !== undefined ||
    photoUrl !== undefined ||
    externalLink !== undefined;

  if (shirtNumber === undefined && isCaptain === undefined && !hasDetailFields) {
    return NextResponse.json(
      { error: "Provide 'shirtNumber', 'isCaptain', and/or custom player fields (name/position/photoUrl/externalLink)" },
      { status: 400 },
    );
  }

  if (hasDetailFields) {
    const updated = await seasonService.updateCustomPlayerDetails(id, playerId, {
      name,
      position,
      photoUrl,
      externalLink,
    });
    if (!updated) {
      return NextResponse.json(
        { error: "Player not found, or only custom players can have their details edited" },
        { status: 403 },
      );
    }
  }

  if (shirtNumber !== undefined || isCaptain !== undefined) {
    await seasonService.updateSeasonPlayer(id, playerId, { shirtNumber, isCaptain });
  }

  const player = await seasonService.getSeasonPlayer(id, playerId);
  return NextResponse.json({ player });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, playerId } = await params;
  await seasonService.removePlayerFromSeason(id, playerId);
  return new NextResponse(null, { status: 204 });
}
