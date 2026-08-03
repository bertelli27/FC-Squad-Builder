import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { playerStatsService } from "@/services/player-stats.service";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id, playerId } = await params;
  const squadPlayer = await prisma.squadPlayer.findUnique({ where: { id: playerId, seasonId: id } });
  if (!squadPlayer) return NextResponse.json({ error: "Player not found in this season" }, { status: 404 });

  const stats = await playerStatsService.listStats(playerId);
  return NextResponse.json({ stats });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id, playerId } = await params;
  const squadPlayer = await prisma.squadPlayer.findUnique({ where: { id: playerId, seasonId: id } });
  if (!squadPlayer) return NextResponse.json({ error: "Player not found in this season" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const competitionId = typeof body?.competitionId === "string" ? body.competitionId : undefined;
  const competitionName = typeof body?.competitionName === "string" ? body.competitionName : undefined;
  if (!competitionId && !competitionName?.trim()) {
    return NextResponse.json(
      { error: "'competitionId' or 'competitionName' is required" },
      { status: 400 },
    );
  }

  const stats = await playerStatsService.addCompetitionStats(playerId, { competitionId, competitionName });
  if (!stats) return NextResponse.json({ error: "Could not resolve competition" }, { status: 400 });

  return NextResponse.json({ stats }, { status: 201 });
}
