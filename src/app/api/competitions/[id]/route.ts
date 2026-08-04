import { NextResponse, type NextRequest } from "next/server";
import { competitionService } from "@/services/competition.service";

type RouteContext = { params: Promise<{ id: string }> };

/** Nova etapa — Gerenciamento: usage summary shown before offering "excluir". */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const usage = await competitionService.getCompetitionUsage(id);
  return NextResponse.json({ usage });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  function optionalStringField(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    return typeof value === "string" ? value : undefined;
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name : undefined;
  const logoUrl = optionalStringField(body.logoUrl);
  const trophyImageUrl = optionalStringField(body.trophyImageUrl);
  const kind = optionalStringField(body.kind);
  const category = optionalStringField(body.category);
  const organizer = optionalStringField(body.organizer);
  const country = optionalStringField(body.country);
  const description = optionalStringField(body.description);

  const competition = await competitionService.updateCompetition(id, {
    name,
    logoUrl,
    trophyImageUrl,
    kind,
    category,
    organizer,
    country,
    description,
  });
  if (!competition) {
    return NextResponse.json({ error: "Could not update competition (name may already exist)" }, { status: 409 });
  }
  return NextResponse.json({ competition });
}

/** Blocked (409) whenever the competition is still referenced anywhere — never a silent cascade. */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const usage = await competitionService.getCompetitionUsage(id);
  if (usage.total > 0) {
    return NextResponse.json(
      { error: "Competition is still referenced by titles or stats", usage },
      { status: 409 },
    );
  }

  const deleted = await competitionService.deleteCompetition(id);
  if (!deleted) return NextResponse.json({ error: "Failed to delete competition" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
