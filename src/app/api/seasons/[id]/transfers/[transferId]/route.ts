import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; transferId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, transferId } = await params;
  await seasonService.removeTransfer(id, transferId);
  return new NextResponse(null, { status: 204 });
}
