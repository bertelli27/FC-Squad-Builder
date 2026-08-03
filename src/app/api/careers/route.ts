import { NextResponse, type NextRequest } from "next/server";
import { careerService } from "@/services/career.service";

export async function GET() {
  const careers = await careerService.listCareers();
  return NextResponse.json({ careers });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }

  const playerRef =
    typeof body.source === "string" && typeof body.externalId === "string"
      ? { source: body.source, externalId: body.externalId }
      : undefined;

  const career = await careerService.createCareer({
    name: body.name,
    photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : undefined,
    playerRef,
  });

  return NextResponse.json({ career }, { status: 201 });
}
