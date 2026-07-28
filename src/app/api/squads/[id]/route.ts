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
  const squad = await squadService.updateSquad(id, {
    name: typeof body?.name === "string" ? body.name : undefined,
    formation: typeof body?.formation === "string" ? body.formation : undefined,
  });

  return NextResponse.json({ squad });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await squadService.getSquad(id);
  if (!existing) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

  await squadService.deleteSquad(id);
  return new NextResponse(null, { status: 204 });
}
