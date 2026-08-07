import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

/** Etapa 10.1 (§3) — busca elencos (clube/seleção) pelo nome, pra vincular "clube atual" a um jogador. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const squads = await squadService.searchSquads(query);
  return NextResponse.json({ squads });
}
