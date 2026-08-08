import { NextResponse, type NextRequest } from "next/server";
import { timelineService } from "@/services/timeline.service";
import { TIMELINE_EVENT_TYPE_MAP } from "@/lib/timeline";

type RouteContext = { params: Promise<{ id: string }> };

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

/**
 * Etapa 10.4 (§14) — edita um evento MANUAL. Só endereça linhas de
 * `TimelineEvent`, que nunca guarda evento automático (esse é calculado
 * na hora, sem id de banco) — não existe forma de esta rota "editar" um
 * automático por engano, é a própria arquitetura que impede.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  if (body.type !== undefined && !TIMELINE_EVENT_TYPE_MAP.has(body.type)) {
    return NextResponse.json({ error: "'type' inválido" }, { status: 400 });
  }

  const event = await timelineService.updateEvent(id, {
    type: typeof body.type === "string" ? body.type : undefined,
    title: typeof body.title === "string" && body.title.trim() ? body.title : undefined,
    description: optionalStringField(body.description),
    year: typeof body.year === "number" && Number.isInteger(body.year) ? body.year : undefined,
    month: optionalIntField(body.month),
    day: optionalIntField(body.day),
    highlight: typeof body.highlight === "boolean" ? body.highlight : undefined,
    imageUrl: optionalStringField(body.imageUrl),
  });

  if (!event) return NextResponse.json({ error: "Timeline event not found" }, { status: 404 });
  return NextResponse.json({ event });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const deleted = await timelineService.deleteEvent(id);
  if (!deleted) return NextResponse.json({ error: "Timeline event not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
