import { NextResponse, type NextRequest } from "next/server";
import { hallOfFameService } from "@/services/hall-of-fame.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const entries = await hallOfFameService.listEntries({
    cachedPlayerId: searchParams.get("cachedPlayerId") || undefined,
    coachId: searchParams.get("coachId") || undefined,
    squadId: searchParams.get("squadId") || undefined,
  });
  return NextResponse.json({ entries });
}

/** Etapa 10.6 (§8) — cria um reconhecimento oficial; exige exatamente um homenageado (jogador OU técnico, nunca os dois, nunca nenhum). */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const cachedPlayerId = typeof body.cachedPlayerId === "string" ? body.cachedPlayerId : undefined;
  const coachId = typeof body.coachId === "string" ? body.coachId : undefined;
  const honoreeCount = [cachedPlayerId, coachId].filter(Boolean).length;
  if (honoreeCount !== 1) {
    return NextResponse.json({ error: "Informe exatamente um homenageado (cachedPlayerId ou coachId)" }, { status: 400 });
  }

  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "'title' é obrigatório" }, { status: 400 });
  }
  if (typeof body.year !== "number" || !Number.isInteger(body.year)) {
    return NextResponse.json({ error: "'year' é obrigatório" }, { status: 400 });
  }

  const entry = await hallOfFameService.createEntry({
    cachedPlayerId,
    coachId,
    squadId: typeof body.squadId === "string" ? body.squadId : undefined,
    title: body.title,
    description: typeof body.description === "string" ? body.description : undefined,
    year: body.year,
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
  });

  return NextResponse.json({ entry }, { status: 201 });
}
