import { NextResponse, type NextRequest } from "next/server";
import { squadTransferService } from "@/services/squad-transfer.service";

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await squadTransferService.exportSquad(id);
  if (!file) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

  const filename = `${slugify(file.squads[0].name) || "elenco"}.json`;
  return new NextResponse(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
