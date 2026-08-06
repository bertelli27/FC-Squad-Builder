import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; transferId: string }> };

function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

function transferWindowField(value: unknown): "start" | "mid" | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value === "start" || value === "mid" ? value : undefined;
}

/** Etapa 9 complementar (§8/§9) — edita clube contrapartida/valor/tipo/janela de uma transferência já registrada. */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id, transferId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const counterpartClub = optionalStringField(body.counterpartClub);
  const value = body.value === null ? null : typeof body.value === "number" ? body.value : undefined;
  const dealType = body.dealType === "loan" || body.dealType === "permanent" ? body.dealType : undefined;
  const transferWindow = transferWindowField(body.transferWindow);

  const result = await seasonService.updateTransfer(id, transferId, { counterpartClub, value, dealType, transferWindow });
  if ("error" in result) {
    const status = result.error === "not-found" ? 404 : 400;
    const message = result.error === "not-found" ? "Transfer not found" : "'counterpartClub' is required for an 'out' transfer";
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ transfer: result.transfer });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, transferId } = await params;
  await seasonService.removeTransfer(id, transferId);
  return new NextResponse(null, { status: 204 });
}
