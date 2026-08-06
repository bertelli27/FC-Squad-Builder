import { NextResponse } from "next/server";
import { categoryService } from "@/services/category.service";
import { squadService } from "@/services/squad.service";

/** "Restaurar ordem automática" (etapa 9 complementar, §4) — limpa a ordem personalizada de grupos e elencos de uma vez. */
export async function POST() {
  await Promise.all([categoryService.resetOrder(), squadService.resetDashboardOrder()]);
  return new NextResponse(null, { status: 204 });
}
