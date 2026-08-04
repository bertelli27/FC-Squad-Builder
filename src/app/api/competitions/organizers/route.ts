import { NextResponse } from "next/server";
import { competitionService } from "@/services/competition.service";

/** Etapa 9 (§33/35) — organizadores já usados, pra autocompletar em vez de digitar do zero toda vez. */
export async function GET() {
  const organizers = await competitionService.listOrganizers();
  return NextResponse.json({ organizers });
}
