import { NextResponse, type NextRequest } from "next/server";
import { careerService } from "@/services/career.service";

type RouteContext = { params: Promise<{ id: string; stintId: string; titleId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { stintId, titleId } = await params;
  await careerService.removeStintTitle(stintId, titleId);
  return new NextResponse(null, { status: 204 });
}
