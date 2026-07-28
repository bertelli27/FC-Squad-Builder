import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (typeof body?.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }

  const shirtNumber = typeof body.shirtNumber === "number" ? body.shirtNumber : undefined;

  const player = await squadService.createCustomPlayer(id, {
    name: body.name,
    position: typeof body.position === "string" ? body.position : undefined,
    photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : undefined,
    externalLink: typeof body.externalLink === "string" ? body.externalLink : undefined,
    shirtNumber,
  });

  return NextResponse.json({ player }, { status: 201 });
}
