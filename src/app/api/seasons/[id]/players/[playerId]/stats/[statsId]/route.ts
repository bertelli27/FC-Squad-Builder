import { NextResponse, type NextRequest } from "next/server";
import { playerStatsService } from "@/services/player-stats.service";

type RouteContext = { params: Promise<{ id: string; playerId: string; statsId: string }> };

function nonNegativeIntField(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { statsId } = await params;
  const body = await request.json().catch(() => null);

  const appearances = nonNegativeIntField(body?.appearances);
  const goals = nonNegativeIntField(body?.goals);
  const assists = nonNegativeIntField(body?.assists);
  if (appearances === undefined && goals === undefined && assists === undefined) {
    return NextResponse.json(
      { error: "Provide at least one of 'appearances', 'goals', 'assists'" },
      { status: 400 },
    );
  }

  const stats = await playerStatsService.updateStats(statsId, { appearances, goals, assists });
  return NextResponse.json({ stats });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { playerId, statsId } = await params;
  await playerStatsService.removeStats(playerId, statsId);
  return new NextResponse(null, { status: 204 });
}
