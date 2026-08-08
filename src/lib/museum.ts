import {
  FootprintsIcon,
  UsersRoundIcon,
  CalendarDaysIcon,
  TrendingUpIcon,
  TrophyIcon,
  CrownIcon,
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Etapa 10.6 — Museu. Só apresentação (label/ícone/link pra origem) — os
 * números em si nunca moram aqui, vêm sempre de `museumService`
 * (que por sua vez só compõe `statisticsService`, nunca recalcula nada).
 * Mesmo padrão de `lib/timeline.ts` (dados no service, vocabulário de
 * exibição na lib pura).
 */
export type MuseumRecordKey =
  | "topScorer"
  | "topAssist"
  | "mostAppearances"
  | "topContributions"
  | "mostClubTitles"
  | "mostPlayerTitles"
  | "biggestPurchase"
  | "biggestSale";

export const MUSEUM_RECORD_META: Record<MuseumRecordKey, { label: string; icon: LucideIcon; sourceHref: string }> = {
  topScorer: { label: "Maior artilheiro", icon: FootprintsIcon, sourceHref: "/statistics/players" },
  topAssist: { label: "Mais assistências", icon: UsersRoundIcon, sourceHref: "/statistics/players" },
  mostAppearances: { label: "Mais jogos", icon: CalendarDaysIcon, sourceHref: "/statistics/players" },
  topContributions: { label: "Maior participação em gols", icon: TrendingUpIcon, sourceHref: "/statistics/players" },
  mostClubTitles: { label: "Clube com mais títulos", icon: TrophyIcon, sourceHref: "/statistics/clubs" },
  mostPlayerTitles: { label: "Jogador com mais títulos", icon: CrownIcon, sourceHref: "/statistics/players" },
  biggestPurchase: { label: "Maior compra", icon: ArrowDownToLineIcon, sourceHref: "/statistics/transfers" },
  biggestSale: { label: "Maior venda", icon: ArrowUpFromLineIcon, sourceHref: "/statistics/transfers" },
};

export interface MuseumRecordVM {
  key: MuseumRecordKey;
  valueLabel: string;
  entity: { name: string; imageUrl: string | null; href: string | null } | null;
}

export interface MuseumMomentVM {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  year: number;
  month?: number | null;
  day?: number | null;
  highlight: boolean;
  imageUrl?: string | null;
  entity: { name: string; href: string };
}
