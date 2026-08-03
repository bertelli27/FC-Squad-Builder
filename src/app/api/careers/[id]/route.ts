import { NextResponse, type NextRequest } from "next/server";
import { careerService } from "@/services/career.service";

type RouteContext = { params: Promise<{ id: string }> };

function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const career = await careerService.getCareer(id);
  if (!career) return NextResponse.json({ error: "Career not found" }, { status: 404 });
  return NextResponse.json({ career });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await careerService.getCareer(id);
  if (!existing) return NextResponse.json({ error: "Career not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" && body.name.trim() ? body.name : undefined;
  const photoUrl = optionalStringField(body?.photoUrl);
  const summary = optionalStringField(body?.summary);

  if (name !== undefined || photoUrl !== undefined || summary !== undefined) {
    await careerService.updateCareer(id, { name, photoUrl, summary });
  }

  const career = await careerService.getCareer(id);
  return NextResponse.json({ career });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  await careerService.deleteCareer(id);
  return new NextResponse(null, { status: 204 });
}
