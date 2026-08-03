"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldHalfIcon, UserRoundIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The app's two big contexts (§1 etapa 4: "CLUBES" and "CARREIRAS DE
 * JOGADORES") — a career is completely separate from a club/season
 * (PlayerCareer doesn't hang off Squad at all), so this is a top-level
 * switch, not a tab nested under either section.
 */
export function MainNav() {
  const pathname = usePathname();
  const isCareers = pathname?.startsWith("/careers");

  return (
    <nav className="flex items-center gap-1">
      <Link
        href="/"
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          !isCareers ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
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
    </nav>
  );
}
