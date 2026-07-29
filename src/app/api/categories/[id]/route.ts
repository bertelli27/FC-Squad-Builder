import { NextResponse, type NextRequest } from "next/server";
import { categoryService } from "@/services/category.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }

  const category = await categoryService.renameCategory(id, body.name);
  return NextResponse.json({ category });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  await categoryService.deleteCategory(id);
  return new NextResponse(null, { status: 204 });
}
