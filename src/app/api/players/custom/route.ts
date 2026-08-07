import { NextResponse, type NextRequest } from "next/server";
import { playerDataService } from "@/services/player-data.service";
import { MAX_SECONDARY_POSITIONS } from "@/lib/positions";

/** Nova etapa — Gerenciamento: lista todos os jogadores criados pelo usuário (source "custom"), opcionalmente filtrados por nome. */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? undefined;
  const players = await playerDataService.listCustomPlayers(query);
  return NextResponse.json({ players });
}

/**
 * Etapa 9 (§4-9) — cria um jogador diretamente pelo Gerenciamento, sem
 * exigir clube/temporada. Mesmo CachedPlayer central de sempre — pode ser
 * adicionado a um elenco depois normalmente (busca por nome já encontra
 * este registro).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }
  if (typeof body.position !== "string" || !body.position.trim()) {
    return NextResponse.json({ error: "'position' is required" }, { status: 400 });
  }

  let secondaryPositions: string[] | undefined;
  if (body.secondaryPositions !== undefined) {
    if (
      !Array.isArray(body.secondaryPositions) ||
      !body.secondaryPositions.every((p: unknown) => typeof p === "string") ||
      body.secondaryPositions.length > MAX_SECONDARY_POSITIONS
    ) {
      return NextResponse.json(
        { error: `'secondaryPositions' must be an array of at most ${MAX_SECONDARY_POSITIONS} strings` },
        { status: 400 },
      );
    }
    secondaryPositions = body.secondaryPositions;
  }

  const player = await playerDataService.createStandalonePlayer({
    name: body.name,
    position: body.position,
    secondaryPositions,
    photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : undefined,
    dateOfBirth: typeof body.dateOfBirth === "string" && body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
    nationality: typeof body.nationality === "string" ? body.nationality : undefined,
    overall: typeof body.overall === "number" ? body.overall : undefined,
    potential: typeof body.potential === "number" ? body.potential : undefined,
    externalLink: typeof body.externalLink === "string" ? body.externalLink : undefined,
    currentClubId: typeof body.currentClubId === "string" ? body.currentClubId : undefined,
    heightCm: typeof body.heightCm === "number" ? body.heightCm : undefined,
    weightKg: typeof body.weightKg === "number" ? body.weightKg : undefined,
    preferredFoot: typeof body.preferredFoot === "string" ? body.preferredFoot : undefined,
  });

  return NextResponse.json({ player }, { status: 201 });
}
