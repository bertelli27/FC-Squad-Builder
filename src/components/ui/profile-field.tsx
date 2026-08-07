import type { LucideIcon } from "lucide-react";

/**
 * Etapa 10.3 (§1) — `Field`/`Stat` compartilhados por toda aba "Visão
 * Geral" (clube/seleção/jogador/técnico/competição), substituindo as
 * versões ad-hoc que cada uma reimplementava. `Field` some sozinho quando
 * `value` é vazio — nunca mostra "Não informado" (§2).
 */
export function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/** Card compacto ícone+valor+label (§3: "🏆 Títulos", "📅 Temporadas", "👤 Último técnico"...) — `value` aceita texto (ex: nome do técnico) ou número (contagem). */
export function Stat({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border p-3">
      {Icon && <Icon className="text-primary size-5 shrink-0" />}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-heading truncate text-lg leading-none font-bold">{value}</span>
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
    </div>
  );
}
