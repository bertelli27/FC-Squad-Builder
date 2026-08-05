import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; type: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, type } = await params;
  await seasonService.removeKit(id, type);
  return new NextResponse(null, { status: 204 });
}
