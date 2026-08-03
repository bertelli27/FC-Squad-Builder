import { NextResponse, type NextRequest } from "next/server";
import { squadService } from "@/services/squad.service";

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
  const formation = typeof body?.formation === "string" ? body.formation : undefined;
  const logoUrl = optionalStringField(body?.logoUrl);
  const coachName = optionalStringField(body?.coachName);
  const coachPhotoUrl = optionalStringField(body?.coachPhotoUrl);
  const coachExternalLink = optionalStringField(body?.coachExternalLink);
  const notes = optionalStringField(body?.notes);
  const isFavorite = typeof body?.isFavorite === "boolean" ? body.isFavorite : undefined;
  const categoryId = optionalStringField(body?.categoryId);
  const tagNames = Array.isArray(body?.tagNames)
    ? body.tagNames.filter((t: unknown): t is string => typeof t === "string")
    : undefined;
  const baseKind = baseKindField(body?.baseKind);

  if (
    name !== undefined ||
    logoUrl !== undefined ||
    coachName !== undefined ||
    coachPhotoUrl !== undefined ||
    coachExternalLink !== undefined ||
    notes !== undefined ||
    isFavorite !== undefined ||
    categoryId !== undefined ||
    tagNames !== undefined ||
    baseKind !== undefined
  ) {
    await squadService.updateSquad(id, {
      name,
      logoUrl,
      coachName,
      coachPhotoUrl,
      coachExternalLink,
      notes,
      isFavorite,
      categoryId,
      tagNames,
      baseKind,
    });
  }

  // Changing formation remaps the starting XI onto the new slot set
  // (see squadService.changeFormation), not just a plain field update.
  const squad =
    formation !== undefined && formation !== existing.formation
      ? await squadService.changeFormation(id, formation)
      : await squadService.getSquad(id);

  return NextResponse.json({ squad });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const existing = await squadService.getSquad(id);
  if (!existing) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

  await squadService.deleteSquad(id);
  return new NextResponse(null, { status: 204 });
}
