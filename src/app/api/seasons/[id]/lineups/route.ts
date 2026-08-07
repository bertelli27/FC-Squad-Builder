import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string }> };

/** Etapa "escalações múltiplas" — cria uma escalação nova pra temporada, opcionalmente partindo dos titulares de outra já existente. */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const formation = typeof body?.formation === "string" ? body.formation : "";
  if (!name || !formation) {
    return NextResponse.json({ error: "'name' and 'formation' are required" }, { status: 400 });
  }

  const duplicateFromLineupId = typeof body?.duplicateFromLineupId === "string" ? body.duplicateFromLineupId : undefined;

  const lineup = await seasonService.createLineup(id, { name, formation, duplicateFromLineupId });
  return NextResponse.json({ lineup }, { status: 201 });
}
