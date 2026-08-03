import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; titleId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, titleId } = await params;
  await seasonService.removeTitle(id, titleId);
  return new NextResponse(null, { status: 204 });
}
