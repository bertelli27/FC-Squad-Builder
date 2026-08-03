import { NextResponse, type NextRequest } from "next/server";
import { careerService } from "@/services/career.service";

type RouteContext = { params: Promise<{ id: string; transferId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, transferId } = await params;
  await careerService.removeTransfer(id, transferId);
  return new NextResponse(null, { status: 204 });
}
