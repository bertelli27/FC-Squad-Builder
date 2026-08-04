import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

/** Etapa 9 (§46) — busca temporadas já cadastradas, pra vincular um campeão histórico a um elenco existente. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const seasons = await squadService.searchSquadSeasons(query);
  return NextResponse.json({ seasons });
}
