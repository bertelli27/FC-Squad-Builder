import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";
import { isValidHexColor } from "@/lib/club-color";

type RouteContext = { params: Promise<{ id: string }> };

// undefined = field not sent, leave untouched; "" or null = clear it.
function optionalStringField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : undefined;
}

// Same undefined/null convention as optionalStringField, but restricted to
// the only two real values baseKind can hold.
function baseKindField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value === "club" || value === "nationalTeam" ? value : undefined;
}

// Same convention, restricted to a valid "#rrggbb" hex string.
function primaryColorField(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return typeof value === "string" && isValidHexColor(value) ? value : undefined;
}

function seasonCalendarField(value: unknown): string | undefined {
  return value === "brasileiro" || value === "europeu" ? value : undefined;
}

function optionalIntField(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const squad = await squadService.getSquad(id);
  if (!squad) return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  return NextResponse.json({ squad });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await squadService.getSquad(id);
  if (!existing) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" && body.name.trim() ? body.name : undefined;
  const logoUrl = optionalStringField(body?.logoUrl);
  const isFavorite = typeof body?.isFavorite === "boolean" ? body.isFavorite : undefined;
  const categoryId = optionalStringField(body?.categoryId);
  const tagNames = Array.isArray(body?.tagNames)
    ? body.tagNames.filter((t: unknown): t is string => typeof t === "string")
    : undefined;
  const baseKind = baseKindField(body?.baseKind);
  const primaryColor = primaryColorField(body?.primaryColor);
  const seasonCalendar = seasonCalendarField(body?.seasonCalendar);
  const fullName = optionalStringField(body?.fullName);
  const country = optionalStringField(body?.country);
  const city = optionalStringField(body?.city);
  const foundedYear = optionalIntField(body?.foundedYear);
  const stadium = optionalStringField(body?.stadium);
  const colors = optionalStringField(body?.colors);
  const confederation = optionalStringField(body?.confederation);

  if (
    name !== undefined ||
    logoUrl !== undefined ||
    isFavorite !== undefined ||
    categoryId !== undefined ||
    tagNames !== undefined ||
    baseKind !== undefined ||
    primaryColor !== undefined ||
    seasonCalendar !== undefined ||
    fullName !== undefined ||
    country !== undefined ||
    city !== undefined ||
    foundedYear !== undefined ||
    stadium !== undefined ||
    colors !== undefined ||
    confederation !== undefined
  ) {
    await squadService.updateSquad(id, {
      name,
      logoUrl,
      isFavorite,
      categoryId,
      tagNames,
      baseKind,
      primaryColor,
      seasonCalendar,
      fullName,
      country,
      city,
      foundedYear,
      stadium,
      colors,
      confederation,
    });
  }

  const squad = await squadService.getSquad(id);
  return NextResponse.json({ squad });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await squadService.getSquad(id);
  if (!existing) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

  await squadService.deleteSquad(id);
  return new NextResponse(null, { status: 204 });
}
