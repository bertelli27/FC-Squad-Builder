import Link from "next/link";
import { UserRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CareerSummaryData {
  id: string;
  summary: string | null;
  _count: { stints: number; transfers: number };
}

/**
 * Etapa 10.2 — aba "Carreira": resumo pequeno, NÃO reimplementa
 * career-workspace.tsx (656 linhas) — só um link "Ver carreira completa"
 * quando existe uma PlayerCareer vinculada, ou um CTA "Criar carreira"
 * quando não existe (carreira é opt-in, a maioria dos jogadores não tem).
 */
export function CareerSummaryCard({ careerId, career }: { careerId: string | null; career: CareerSummaryData | null }) {
  if (!careerId || !career) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center">
        <UserRoundIcon className="text-muted-foreground size-8" strokeWidth={1.25} />
        <p className="text-muted-foreground text-sm">Este jogador ainda não tem uma carreira detalhada.</p>
        <Button
          size="sm"
          render={<Link href="/careers/new">Criar carreira</Link>}
          nativeButton={false}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      {career.summary && <p className="text-sm whitespace-pre-wrap">{career.summary}</p>}
      <p className="text-muted-foreground text-xs">
        {career._count.stints} {career._count.stints === 1 ? "passagem" : "passagens"} · {career._count.transfers}{" "}
        {career._count.transfers === 1 ? "transferência" : "transferências"}
      </p>
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        render={<Link href={`/careers/${career.id}`}>Ver carreira completa</Link>}
        nativeButton={false}
      />
    </div>
  );
}
