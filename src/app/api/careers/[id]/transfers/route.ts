import { NextResponse, type NextRequest } from "next/server";
import { careerService } from "@/services/career.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const toClubName = typeof body?.toClubName === "string" && body.toClubName.trim() ? body.toClubName : undefined;
  const year = typeof body?.year === "number" ? body.year : undefined;
  if (!toClubName || year === undefined) {
    return NextResponse.json({ error: "'toClubName' and 'year' are required" }, { status: 400 });
  }

  const fromClubName = typeof body?.fromClubName === "string" ? body.fromClubName : undefined;
  const value = typeof body?.value === "number" && Number.isFinite(body.value) ? body.value : undefined;

  const transfer = await careerService.addTransfer(id, { fromClubName, toClubName, value, year });
  return NextResponse.json({ transfer }, { status: 201 });
}
