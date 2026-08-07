import { NextResponse, type NextRequest } from "next/server";
import { playerDataService } from "@/services/player-data.service";

type RouteContext = { params: Promise<{ id: string }> };

/** Etapa 10.1 (§3) — clube atual do jogador, buscado à parte pelo EditPlayerForm ao abrir (não faz parte do DTO genérico Player). */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const currentClub = await playerDataService.getCurrentClub(id);
  return NextResponse.json({ currentClub });
}
