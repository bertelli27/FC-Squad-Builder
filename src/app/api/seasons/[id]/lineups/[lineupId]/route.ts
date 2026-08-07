import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; lineupId: string }> };

/** Etapa "escalações múltiplas" — renomeia e/ou troca a formação (remapeando os titulares) de uma escalação. */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, lineupId } = await params;
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const formation = typeof body?.formation === "string" ? body.formation : undefined;
  if (name === undefined && formation === undefined) {
    return NextResponse.json({ error: "Provide 'name' and/or 'formation'" }, { status: 400 });
  }
  if (name === "") {
    return NextResponse.json({ error: "'name' cannot be empty" }, { status: 400 });
  }

  if (name !== undefined) await seasonService.renameLineup(id, lineupId, name);
  if (formation !== undefined) {
    const season = await seasonService.changeLineupFormation(id, lineupId, formation);
    if (!season) return NextResponse.json({ error: "Lineup not found" }, { status: 404 });
    return NextResponse.json({ season });
  }

  const season = await seasonService.getSeason(id);
  return NextResponse.json({ season });
}

/** Exclui uma escalação — nunca a última da temporada. */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, lineupId } = await params;
  const result = await seasonService.deleteLineup(id, lineupId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return new NextResponse(null, { status: 204 });
}
