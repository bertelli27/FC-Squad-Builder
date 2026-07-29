import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const squad = await squadService.duplicateSquad(id);
  if (!squad) return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  return NextResponse.json({ squad }, { status: 201 });
}
