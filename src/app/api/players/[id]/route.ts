import { NextResponse, type NextRequest } from "next/server";
import { playerDataService } from "@/services/player-data.service";
import { MAX_SECONDARY_POSITIONS } from "@/lib/positions";

type RouteContext = { params: Promise<{ id: string }> };

// undefined = field not sent, leave untouched; null = clear it.
function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

function optionalIntField(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

function optionalDateField(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Editing a player's cadastral data — name/photo/nascimento/nacionalidade/
 * posições/overall/potencial (§16-§27, etapa 6). Works for a CachedPlayer
 * of any source, not just "custom" ones: this is the single shared edit
 * endpoint used both from the squad/season player profile and from the
 * Carreira module (§27 — "utilizar o mesmo formulário/componente").
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const name = typeof body.name === "string" && body.name.trim() ? body.name : undefined;
  const photoUrl = optionalStringField(body.photoUrl);
  const dateOfBirth = optionalDateField(body.dateOfBirth);
  const nationality = optionalStringField(body.nationality);
  const position = optionalStringField(body.position);
  const overall = optionalIntField(body.overall);
  const potential = optionalIntField(body.potential);
  const externalLink = optionalStringField(body.externalLink);

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

  const player = await playerDataService.updatePlayer(id, {
    name,
    photoUrl,
    dateOfBirth,
    nationality,
    position,
    secondaryPositions,
    overall,
    potential,
    externalLink,
  });

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  return NextResponse.json({ player });
}
