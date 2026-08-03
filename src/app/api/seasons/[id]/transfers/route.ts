import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const type = body?.type === "in" || body?.type === "out" ? body.type : undefined;
  const playerName = typeof body?.playerName === "string" && body.playerName.trim() ? body.playerName : undefined;
  if (!type || !playerName) {
    return NextResponse.json({ error: "'type' ('in'|'out') and 'playerName' are required" }, { status: 400 });
  }

  const counterpartClub = typeof body?.counterpartClub === "string" ? body.counterpartClub : undefined;
  const value = typeof body?.value === "number" && Number.isFinite(body.value) ? body.value : undefined;

  const transfer = await seasonService.addTransfer(id, { type, playerName, counterpartClub, value });
  return NextResponse.json({ transfer }, { status: 201 });
}
