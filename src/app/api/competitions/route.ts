import { NextResponse, type NextRequest } from "next/server";
import { competitionService } from "@/services/competition.service";

export async function GET() {
  const competitions = await competitionService.listCompetitions();
  return NextResponse.json({ competitions });
}

function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

/** Etapa 9 (§26) — cria uma competição pelo Gerenciamento já com a classificação completa. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }

  const competition = await competitionService.createCompetition({
    name: body.name,
    logoUrl: optionalStringField(body.logoUrl),
    trophyImageUrl: optionalStringField(body.trophyImageUrl),
    kind: optionalStringField(body.kind),
    scope: optionalStringField(body.scope),
    organizer: optionalStringField(body.organizer),
    country: optionalStringField(body.country),
    description: optionalStringField(body.description),
  });
  if (!competition) {
    return NextResponse.json({ error: "Could not create competition (name may already exist)" }, { status: 409 });
  }
  return NextResponse.json({ competition }, { status: 201 });
}
