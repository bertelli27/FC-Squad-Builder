import { NextResponse, type NextRequest } from "next/server";
import { careerService } from "@/services/career.service";

type RouteContext = { params: Promise<{ id: string; stintId: string }> };

function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

function nonNegativeIntField(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { stintId } = await params;
  const body = await request.json().catch(() => null);

  const clubName = typeof body?.clubName === "string" && body.clubName.trim() ? body.clubName : undefined;
  const clubLogoUrl = optionalStringField(body?.clubLogoUrl);
  const startYear = typeof body?.startYear === "number" ? body.startYear : undefined;
  const calendar = body?.calendar === "europeu" || body?.calendar === "brasileiro" ? body.calendar : undefined;
  const appearances = nonNegativeIntField(body?.appearances);
  const goals = nonNegativeIntField(body?.goals);
  const assists = nonNegativeIntField(body?.assists);
  const summary = optionalStringField(body?.summary);

  const stint = await careerService.updateStint(stintId, {
    clubName,
    clubLogoUrl,
    startYear,
    calendar,
    appearances,
    goals,
    assists,
    summary,
  });

  return NextResponse.json({ stint });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id, stintId } = await params;
  await careerService.removeStint(id, stintId);
  return new NextResponse(null, { status: 204 });
}
