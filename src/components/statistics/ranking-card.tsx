import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export interface RankingCardEntry {
  key: string;
  label: React.ReactNode;
  value: React.ReactNode;
}

/** Etapa 10.5 (§3) — prévia compacta (Top 5) de um ranking, usada só no dashboard do Centro de Estatísticas. */
export function RankingCard({
  icon,
  title,
  href,
  entries,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  entries: RankingCardEntry[];
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-3">
        {entries.length === 0 ? (
          <EmptyState label="Sem dados ainda." className="py-6" />
        ) : (
          <ol className="flex flex-col gap-1.5">
            {entries.map((entry, i) => (
              <li key={entry.key} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-4 shrink-0 text-right text-xs">{i + 1}.</span>
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                <span className="text-muted-foreground shrink-0 text-xs">{entry.value}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
      <Link href={href} className="text-primary flex items-center justify-center gap-1 border-t py-2 text-xs hover:underline">
        Ver tudo
        <ChevronRightIcon className="size-3.5" />
      </Link>
    </Card>
  );
}
