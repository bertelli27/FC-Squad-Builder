import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }

  const shirtNumber = typeof body.shirtNumber === "number" ? body.shirtNumber : undefined;
  const destination = body.destination === "watchlist" ? "watchlist" : "bench";
  const secondaryPositions =
    Array.isArray(body.secondaryPositions) && body.secondaryPositions.every((p: unknown) => typeof p === "string")
      ? body.secondaryPositions.slice(0, 3)
      : undefined;
  const dateOfBirth = typeof body.dateOfBirth === "string" && body.dateOfBirth ? new Date(body.dateOfBirth) : undefined;
  const overall = typeof body.overall === "number" ? body.overall : undefined;
  const potential = typeof body.potential === "number" ? body.potential : undefined;

  const player = await seasonService.createCustomPlayer(id, {
    name: body.name,
    position: typeof body.position === "string" ? body.position : undefined,
    secondaryPositions,
    photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : undefined,
    dateOfBirth,
    nationality: typeof body.nationality === "string" ? body.nationality : undefined,
    overall,
    potential,
    externalLink: typeof body.externalLink === "string" ? body.externalLink : undefined,
    shirtNumber,
    destination,
  });

  return NextResponse.json({ player }, { status: 201 });
}
