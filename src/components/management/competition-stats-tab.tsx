import { ChartNoAxesColumnIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/** Etapa 10.2 — placeholder reservado; recordes/estatísticas complexas ficam pra depois, de propósito. */
export function CompetitionStatsTab() {
  return <EmptyState icon={ChartNoAxesColumnIcon} label="Estatísticas e recordes — em breve." />;
}
