import { NextResponse, type NextRequest } from "next/server";
import { playerDataService } from "@/services/player-data.service";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Etapa 10.1 (§3) / Etapa 10.2 — campos que o EditPlayerForm busca à parte
 * ao abrir (clube atual + altura/peso/pé), nenhum deles fazendo parte do
 * DTO genérico Player/EditablePlayer.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const extras = await playerDataService.getEditExtras(id);
  return NextResponse.json(extras);
}
