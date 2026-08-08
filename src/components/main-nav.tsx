"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldHalfIcon, UserRoundIcon, SettingsIcon, ChartColumnIcon, LandmarkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The app's big contexts (§1 etapa 4: "CLUBES" and "CARREIRAS DE
 * JOGADORES") — a career is completely separate from a club/season
 * (PlayerCareer doesn't hang off Squad at all), so this is a top-level
 * switch, not a tab nested under either section. Etapa 10.5: "Estatísticas"
 * (Centro de Estatísticas) entra como um quarto contexto de topo — é uma
 * área de leitura/análise, diferente de Gerenciamento (CRUD de entidades
 * próprias), merece nav própria em vez de ficar escondida lá dentro. Etapa
 * 10.6: "Museu" entra como um 5º contexto de topo — camada de preservação
 * histórica (recordes/momentos/Hall da Fama), distinta de Estatísticas
 * (rankings brutos) e de Gerenciamento (CRUD).
 */
export function MainNav() {
  const pathname = usePathname();
  const isCareers = pathname?.startsWith("/careers");
  const isManagement = pathname?.startsWith("/management");
  const isStatistics = pathname?.startsWith("/statistics");
  const isMuseum = pathname?.startsWith("/museum");
  const isClubs = !isCareers && !isManagement && !isStatistics && !isMuseum;

  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto">
      <Link
        href="/"
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isClubs ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ShieldHalfIcon className="size-4" />
        Clubes
      </Link>
      <Link
        href="/careers"
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isCareers ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <UserRoundIcon className="size-4" />
        Carreiras
      </Link>
      <Link
        href="/management"
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isManagement ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <SettingsIcon className="size-4" />
        Gerenciamento
      </Link>
      <Link
        href="/statistics"
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isStatistics ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <ChartColumnIcon className="size-4" />
        Estatísticas
      </Link>
      <Link
        href="/museum"
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          isMuseum ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LandmarkIcon className="size-4" />
        Museu
      </Link>
    </nav>
  );
}
