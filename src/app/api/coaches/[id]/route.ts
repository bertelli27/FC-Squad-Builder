import { NextResponse, type NextRequest } from "next/server";
import { coachService } from "@/services/coach.service";

type RouteContext = { params: Promise<{ id: string }> };

/** Usage summary shown before offering "excluir" — see coachService.getCoachUsage. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const usage = await coachService.getCoachUsage(id);
  return NextResponse.json({ usage });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const name = typeof body.name === "string" && body.name.trim() ? body.name : undefined;
  const photoUrl =
    body.photoUrl === undefined
      ? undefined
      : body.photoUrl === null || body.photoUrl === ""
        ? null
        : typeof body.photoUrl === "string"
          ? body.photoUrl
          : undefined;
  const externalLink =
    body.externalLink === undefined
      ? undefined
      : body.externalLink === null || body.externalLink === ""
        ? null
        : typeof body.externalLink === "string"
          ? body.externalLink
          : undefined;

  const coach = await coachService.updateCoach(id, { name, photoUrl, externalLink });
  if (!coach) return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  return NextResponse.json({ coach });
}

/**
 * §31/§32: deleting a coach only clears Season.coachId (ON DELETE SET
 * NULL) — the seasons themselves, and everything in them, are untouched.
 * Unlike competitions (where usage means irreplaceable historical titles/
 * stats), a coach's only dependents are display references, so this
 * always allows the delete — the UI shows the affected season count and
 * asks for confirmation before calling this, it's never silently blocked.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const deleted = await coachService.deleteCoach(id);
  if (!deleted) return NextResponse.json({ error: "Failed to delete coach" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
