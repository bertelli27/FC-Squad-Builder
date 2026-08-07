import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; lineupId: string }> };

interface StarterInput {
  squadPlayerId: string;
  positionSlot: string;
  xOffset?: number | null;
  yOffset?: number | null;
}

function isValidStarter(value: unknown): value is StarterInput {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.squadPlayerId === "string" &&
    typeof v.positionSlot === "string" &&
    (v.xOffset === undefined || v.xOffset === null || typeof v.xOffset === "number") &&
    (v.yOffset === undefined || v.yOffset === null || typeof v.yOffset === "number")
  );
}

/** Etapa "escalações múltiplas" — substitui a lista inteira de titulares (quem + onde) de UMA escalação, depois de um drag-and-drop no campo tático. */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, lineupId } = await params;
  const body = await request.json().catch(() => null);

  if (!Array.isArray(body?.starters) || !body.starters.every(isValidStarter)) {
    return NextResponse.json({ error: "Invalid 'starters' payload" }, { status: 400 });
  }

  const result = await seasonService.replaceLineupStarters(id, lineupId, body.starters);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404 });

  return new NextResponse(null, { status: 204 });
}
