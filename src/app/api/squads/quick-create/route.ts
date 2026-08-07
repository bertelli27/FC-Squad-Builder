import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

/** Etapa 10.3 (§16/§17) — criação rápida de clube (nome, país, escudo) a partir do ClubDestinationPicker, sem Season. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }

  const squad = await squadService.createBareSquad({
    name: body.name,
    country: typeof body.country === "string" ? body.country : undefined,
    logoUrl: typeof body.logoUrl === "string" ? body.logoUrl : undefined,
  });

  return NextResponse.json({ squad }, { status: 201 });
}
