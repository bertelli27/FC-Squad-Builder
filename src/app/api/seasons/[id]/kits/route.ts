import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";
import { isKitType } from "@/lib/kits";

type RouteContext = { params: Promise<{ id: string }> };

/** Etapa 9 parte 3 — adiciona OU substitui o kit de um tipo (upsert, ver seasonService.setKit). */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const type = body?.type;
  const imageUrl = body?.imageUrl;
  if (!isKitType(type)) {
    return NextResponse.json({ error: "'type' must be one of home/away/third/fourth/goalkeeper" }, { status: 400 });
  }
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return NextResponse.json({ error: "'imageUrl' is required" }, { status: 400 });
  }

  const kit = await seasonService.setKit(id, type, imageUrl);
  if (!kit) return NextResponse.json({ error: "Could not save kit" }, { status: 400 });

  return NextResponse.json({ kit }, { status: 201 });
}
