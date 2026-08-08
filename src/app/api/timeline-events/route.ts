import { NextResponse, type NextRequest } from "next/server";
import { timelineService } from "@/services/timeline.service";
import { TIMELINE_EVENT_TYPE_MAP } from "@/lib/timeline";

/** Etapa 10.4 (§13) — cria um evento manual da Timeline; exige exatamente uma entidade dona. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const squadId = typeof body.squadId === "string" ? body.squadId : undefined;
  const cachedPlayerId = typeof body.cachedPlayerId === "string" ? body.cachedPlayerId : undefined;
  const competitionId = typeof body.competitionId === "string" ? body.competitionId : undefined;
  const entityCount = [squadId, cachedPlayerId, competitionId].filter(Boolean).length;
  if (entityCount !== 1) {
    return NextResponse.json({ error: "Informe exatamente uma entidade (squadId, cachedPlayerId ou competitionId)" }, { status: 400 });
  }

  if (typeof body.type !== "string" || !TIMELINE_EVENT_TYPE_MAP.has(body.type)) {
    return NextResponse.json({ error: "'type' inválido" }, { status: 400 });
  }
  if (typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "'title' é obrigatório" }, { status: 400 });
  }
  if (typeof body.year !== "number" || !Number.isInteger(body.year)) {
    return NextResponse.json({ error: "'year' é obrigatório" }, { status: 400 });
  }

  const event = await timelineService.createEvent({
    squadId,
    cachedPlayerId,
    competitionId,
    type: body.type,
    title: body.title,
    description: typeof body.description === "string" ? body.description : undefined,
    year: body.year,
    month: typeof body.month === "number" && Number.isInteger(body.month) ? body.month : undefined,
    day: typeof body.day === "number" && Number.isInteger(body.day) ? body.day : undefined,
    highlight: typeof body.highlight === "boolean" ? body.highlight : undefined,
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
  });

  return NextResponse.json({ event }, { status: 201 });
}
