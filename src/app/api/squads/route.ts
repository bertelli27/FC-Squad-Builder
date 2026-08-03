import { NextResponse, type NextRequest } from "next/server";
import { squadService, type CreateSquadInput } from "@/services/squad.service";

export async function GET() {
  const squads = await squadService.listSquads();
  return NextResponse.json({ squads });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }

  const base: CreateSquadInput["base"] =
    body.base &&
    (body.base.kind === "club" || body.base.kind === "nationalTeam") &&
    typeof body.base.name === "string"
      ? { kind: body.base.kind, name: body.base.name }
      : undefined;

  const { squad, season } = await squadService.createSquad({
    name: body.name,
    formation: typeof body.formation === "string" ? body.formation : undefined,
    base,
    categoryId: typeof body.categoryId === "string" ? body.categoryId : undefined,
    tagNames: Array.isArray(body.tagNames) ? body.tagNames.filter((t: unknown) => typeof t === "string") : undefined,
  });

  return NextResponse.json({ squad, season }, { status: 201 });
}
