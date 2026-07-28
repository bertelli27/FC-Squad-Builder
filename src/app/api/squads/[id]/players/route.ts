import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

type RouteContext = { params: Promise<{ id: string }> };

interface PlayerUpdate {
  id: string;
  positionSlot: string | null;
  isStarter: boolean;
  order: number;
}

function isValidUpdate(value: unknown): value is PlayerUpdate {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    (v.positionSlot === null || typeof v.positionSlot === "string") &&
    typeof v.isStarter === "boolean" &&
    typeof v.order === "number"
  );
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!Array.isArray(body?.players) || !body.players.every(isValidUpdate)) {
    return NextResponse.json({ error: "Invalid 'players' payload" }, { status: 400 });
  }

  await squadService.updateSquadPlayers(id, body.players);
  const squad = await squadService.getSquad(id);
  return NextResponse.json({ squad });
}
