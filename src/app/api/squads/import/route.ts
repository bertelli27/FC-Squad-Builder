import { NextResponse, type NextRequest } from "next/server";
import { parseImportFile, squadTransferService } from "@/services/squad-transfer.service";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const strategy = body.strategy === "replace" ? "replace" : "keep-both";
  const { entries, errors } = parseImportFile(body.file);

  if (entries.length === 0) {
    return NextResponse.json({ error: "Nenhum elenco válido encontrado no arquivo.", errors }, { status: 400 });
  }

  const result = await squadTransferService.importSquads(entries, strategy);
  return NextResponse.json({ ...result, errors });
}
