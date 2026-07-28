import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const squad = await squadService.getSquad(id);
  if (!squad) return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  return NextResponse.json({ squad });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await squadService.getSquad(id);
  if (!existing) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name : undefined;
  const formation = typeof body?.formation === "string" ? body.formation : undefined;

  if (name !== undefined) {
    await squadService.updateSquad(id, { name });
  }

  // Changing formation remaps the starting XI onto the new slot set
  // (see squadService.changeFormation), not just a plain field update.
  const squad =
    formation !== undefined && formation !== existing.formation
      ? await squadService.changeFormation(id, formation)
      : await squadService.getSquad(id);

  return NextResponse.json({ squad });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await squadService.getSquad(id);
  if (!existing) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

  await squadService.deleteSquad(id);
  return new NextResponse(null, { status: 204 });
}
