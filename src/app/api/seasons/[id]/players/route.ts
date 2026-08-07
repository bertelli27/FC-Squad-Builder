import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string }> };

interface PlayerUpdate {
  id: string;
  isWatchlist: boolean;
  isExtra: boolean;
  shirtNumber: number | null;
  order: number;
}

function isValidUpdate(value: unknown): value is PlayerUpdate {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.isWatchlist === "boolean" &&
    typeof v.isExtra === "boolean" &&
    (v.shirtNumber === null || typeof v.shirtNumber === "number") &&
    typeof v.order === "number"
  );
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!Array.isArray(body?.players) || !body.players.every(isValidUpdate)) {
    return NextResponse.json({ error: "Invalid 'players' payload" }, { status: 400 });
  }

  await seasonService.updateSeasonPlayers(id, body.players);
  const season = await seasonService.getSeason(id);
  return NextResponse.json({ season });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.source !== "string" || typeof body?.externalId !== "string") {
    return NextResponse.json(
      { error: "'source' and 'externalId' are required" },
      { status: 400 },
    );
  }

  const destination = body.destination === "watchlist" ? "watchlist" : "bench";
  const player = await seasonService.addPlayerToSeason(
    id,
    { source: body.source, externalId: body.externalId },
    destination,
  );
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  return NextResponse.json({ player }, { status: 201 });
}
