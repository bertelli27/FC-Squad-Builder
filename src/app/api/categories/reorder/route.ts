import { NextResponse, type NextRequest } from "next/server";
import { categoryService } from "@/services/category.service";

/** Dashboard personalizável (etapa 9 complementar, §1/§3) — reordena os grupos (categorias) da home. */
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.orderedIds) || !body.orderedIds.every((id: unknown) => typeof id === "string")) {
    return NextResponse.json({ error: "'orderedIds' must be a string array" }, { status: 400 });
  }

  await categoryService.reorderCategories(body.orderedIds);
  return new NextResponse(null, { status: 204 });
}
