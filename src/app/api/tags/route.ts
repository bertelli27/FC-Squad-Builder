import { NextResponse } from "next/server";
import { tagService } from "@/services/tag.service";

export async function GET() {
  const tags = await tagService.listTags();
  return NextResponse.json({ tags });
}
