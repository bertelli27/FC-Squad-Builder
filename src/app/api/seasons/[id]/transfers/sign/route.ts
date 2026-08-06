import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string }> };

const ERROR_STATUS: Record<string, number> = {
  "missing-player": 400,
  "player-not-found": 404,
  "already-in-squad": 409,
};

/**
 * §8-§13: signs a player INTO this season's roster (compra/empréstimo) —
 * either an existing player (source+externalId) or a brand new one
 * (§9 opção B), adding them to the roster and recording the Transfer in
 * one action.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const playerRef =
    typeof body.source === "string" && typeof body.externalId === "string"
      ? { source: body.source, externalId: body.externalId }
      : undefined;

  const newPlayer =
    !playerRef && typeof body.newPlayer?.name === "string" && body.newPlayer.name.trim()
      ? {
          name: body.newPlayer.name,
          position: typeof body.newPlayer.position === "string" ? body.newPlayer.position : undefined,
          secondaryPositions: Array.isArray(body.newPlayer.secondaryPositions)
            ? body.newPlayer.secondaryPositions.filter((p: unknown) => typeof p === "string").slice(0, 3)
            : undefined,
          photoUrl: typeof body.newPlayer.photoUrl === "string" ? body.newPlayer.photoUrl : undefined,
          dateOfBirth:
            typeof body.newPlayer.dateOfBirth === "string" && body.newPlayer.dateOfBirth
              ? new Date(body.newPlayer.dateOfBirth)
              : undefined,
          nationality: typeof body.newPlayer.nationality === "string" ? body.newPlayer.nationality : undefined,
          overall: typeof body.newPlayer.overall === "number" ? body.newPlayer.overall : undefined,
          potential: typeof body.newPlayer.potential === "number" ? body.newPlayer.potential : undefined,
          externalLink: typeof body.newPlayer.externalLink === "string" ? body.newPlayer.externalLink : undefined,
        }
      : undefined;

  const shirtNumber = typeof body.shirtNumber === "number" ? body.shirtNumber : undefined;
  const counterpartClub = typeof body.counterpartClub === "string" ? body.counterpartClub : undefined;
  const value = typeof body.value === "number" && Number.isFinite(body.value) && body.value >= 0 ? body.value : undefined;
  const dealType = body.dealType === "loan" ? "loan" : "permanent";
  const transferWindow = body.transferWindow === "start" || body.transferWindow === "mid" ? body.transferWindow : undefined;

  const result = await seasonService.signPlayer(id, {
    playerRef,
    newPlayer,
    shirtNumber,
    counterpartClub,
    value,
    dealType,
    transferWindow,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: ERROR_STATUS[result.error] ?? 400 });
  }

  return NextResponse.json({ player: result.player, transfer: result.transfer }, { status: 201 });
}
