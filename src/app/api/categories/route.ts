import { NextResponse, type NextRequest } from "next/server";
import { categoryService } from "@/services/category.service";

export async function GET() {
  const categories = await categoryService.listCategories();
  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "'name' is required" }, { status: 400 });
  }

  const category = await categoryService.createCategory(body.name);
  return NextResponse.json({ category }, { status: 201 });
}
