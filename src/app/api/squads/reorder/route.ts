import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

/** Dashboard personalizável (etapa 9 complementar, §2/§3) — reordena os elencos dentro de um grupo (ou da lista geral). */
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.orderedIds) || !body.orderedIds.every((id: unknown) => typeof id === "string")) {
    return NextResponse.json({ error: "'orderedIds' must be a string array" }, { status: 400 });
  }

  await squadService.reorderSquads(body.orderedIds);
  return new NextResponse(null, { status: 204 });
}
