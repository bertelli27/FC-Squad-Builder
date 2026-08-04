import { NextResponse, type NextRequest } from "next/server";
import { competitionService } from "@/services/competition.service";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Etapa 9 (§43-49) — adiciona uma edição ao histórico de campeões. Corpo
 * aceita OU `seasonId` (Modo B: vincula a um elenco já cadastrado) OU
 * `standaloneName` (+ logo/país opcionais — Modo A: registro histórico
 * independente), nunca os dois.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const year = typeof body?.year === "number" && Number.isInteger(body.year) ? body.year : undefined;
  if (year === undefined) {
    return NextResponse.json({ error: "'year' must be an integer" }, { status: 400 });
  }

  const seasonId = typeof body?.seasonId === "string" ? body.seasonId : undefined;
  const standaloneName = typeof body?.standaloneName === "string" ? body.standaloneName : undefined;

  if (!seasonId && !standaloneName?.trim()) {
    return NextResponse.json({ error: "Provide either 'seasonId' or 'standaloneName'" }, { status: 400 });
  }

  const champion = seasonId
    ? await competitionService.addChampion(id, { year, seasonId })
    : await competitionService.addChampion(id, {
        year,
        standaloneName: standaloneName!,
        standaloneLogoUrl: typeof body?.standaloneLogoUrl === "string" ? body.standaloneLogoUrl : undefined,
        standaloneCountry: typeof body?.standaloneCountry === "string" ? body.standaloneCountry : undefined,
      });

  if (!champion) {
    return NextResponse.json({ error: "Could not add champion (year may already be registered)" }, { status: 409 });
  }
  return NextResponse.json({ champion }, { status: 201 });
}
