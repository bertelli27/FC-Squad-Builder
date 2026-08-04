import { NextResponse, type NextRequest } from "next/server";
import { playerDataService } from "@/services/player-data.service";

/** Nova etapa — Gerenciamento: lista todos os jogadores criados pelo usuário (source "custom"), opcionalmente filtrados por nome. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const players = await playerDataService.listCustomPlayers(query);
  return NextResponse.json({ players });
}
