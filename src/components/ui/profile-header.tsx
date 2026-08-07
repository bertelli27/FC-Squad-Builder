import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Etapa 10.3 (§1/§2) — cabeçalho compartilhado por todo perfil (clube,
 * seleção, jogador, técnico, competição): avatar + título + linha
 * horizontal de fatos (separados por "·", só os que existem — nunca
 * "Não informado") + slot de ação. Cada `facts` falsy (null/undefined/
 * false) é descartado antes de renderizar, então o chamador pode passar
 * `pais && <>...</>` direto sem checar vazio duas vezes.
 */
export function ProfileHeader({
  avatar,
  title,
  facts,
  action,
}: {
  avatar: ReactNode;
  title: string;
  facts?: (ReactNode | null | undefined | false)[];
  action?: ReactNode;
}) {
  const cleanFacts = (facts ?? []).filter(Boolean) as ReactNode[];

  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {avatar}
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
            {cleanFacts.length > 0 && (
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                {cleanFacts.map((fact, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span aria-hidden className="text-muted-foreground/50">·</span>}
                    {fact}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
