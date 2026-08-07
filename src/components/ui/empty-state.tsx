import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Etapa 10.2 — bloco de "vazio" compartilhado; antes cada tela reinventava o próprio. */
export function EmptyState({
  icon: Icon,
  label,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center",
        className,
      )}
    >
      {Icon && <Icon className="text-muted-foreground size-8" strokeWidth={1.25} />}
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
