import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

const ERROR_STATUS: Record<string, number> = {
  "missing-club": 400,
  "not-in-squad": 404,
};

/**
 * §2-§7: transfers a player OUT of this season's roster (venda/empréstimo)
 * — removes the SquadPlayer row and records the Transfer in one action.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id, playerId } = await params;
  const body = await request.json().catch(() => null);

  const counterpartClub = typeof body?.counterpartClub === "string" ? body.counterpartClub : "";
  const value = typeof body?.value === "number" && Number.isFinite(body.value) && body.value >= 0 ? body.value : undefined;
  const dealType = body?.dealType === "loan" ? "loan" : "permanent";
  const transferWindow = body?.transferWindow === "start" || body?.transferWindow === "mid" ? body.transferWindow : undefined;

  const result = await seasonService.transferPlayerOut(id, playerId, { counterpartClub, value, dealType, transferWindow });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: ERROR_STATUS[result.error] ?? 400 });
  }

  return NextResponse.json({ transfer: result.transfer }, { status: 201 });
}
