import { NextResponse } from "next/server";
import { squadTransferService } from "@/services/squad-transfer.service";

export async function GET() {
  const file = await squadTransferService.exportAllSquads();
  return new NextResponse(JSON.stringify(file, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="elencos.json"',
    },
  });
}
