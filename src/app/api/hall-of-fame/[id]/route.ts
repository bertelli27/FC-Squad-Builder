import { NextResponse, type NextRequest } from "next/server";
import { hallOfFameService } from "@/services/hall-of-fame.service";

type RouteContext = { params: Promise<{ id: string }> };

function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

/** Etapa 10.6 — edita contexto/título/ano/descrição/imagem de um reconhecimento já existente. O homenageado (cachedPlayerId/coachId) não é editável aqui — ver comentário em hallOfFameService.updateEntry. */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const entry = await hallOfFameService.updateEntry(id, {
    title: typeof body.title === "string" && body.title.trim() ? body.title : undefined,
    description: optionalStringField(body.description),
    year: typeof body.year === "number" && Number.isInteger(body.year) ? body.year : undefined,
    imageUrl: optionalStringField(body.imageUrl),
    squadId: optionalStringField(body.squadId),
  });

  if (!entry) return NextResponse.json({ error: "Hall of Fame entry not found" }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const deleted = await hallOfFameService.deleteEntry(id);
  if (!deleted) return NextResponse.json({ error: "Hall of Fame entry not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
