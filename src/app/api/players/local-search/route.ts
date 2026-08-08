import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Etapa 10.6 — busca por nome só entre `CachedPlayer` JÁ existentes no
 * banco (diferente de `/api/players/search`, que também consulta as
 * fontes externas pra ADICIONAR alguém novo a um elenco). O Hall da Fama
 * só reconhece quem já faz parte dos dados do sistema — não faz sentido
 * "criar" um jogador na hora de homenageá-lo.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const players = await prisma.cachedPlayer.findMany({
    where: query?.trim() ? { name: { contains: query.trim(), mode: "insensitive" } } : undefined,
    select: { id: true, name: true, photoUrl: true, club: true },
    orderBy: { name: "asc" },
    take: 50,
  });
  return NextResponse.json({ players });
}
