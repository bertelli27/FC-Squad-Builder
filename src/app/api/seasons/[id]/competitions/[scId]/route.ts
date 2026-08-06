import { NextResponse, type NextRequest } from "next/server";
import { seasonService } from "@/services/season.service";

type RouteContext = { params: Promise<{ id: string; scId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, scId } = await params;
  await seasonService.removeSeasonCompetition(id, scId);
  return new NextResponse(null, { status: 204 });
}
