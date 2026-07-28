export type RatingTier = "elite" | "great" | "good" | "average";

/** EA FC-style tiering by overall: gold cards, green (our brand tone), blue, and plain. */
export function getRatingTier(overall?: number | null): RatingTier {
  if (overall == null) return "average";
  if (overall >= 85) return "elite";
  if (overall >= 75) return "great";
  if (overall >= 65) return "good";
  return "average";
}

interface RatingTierStyle {
  /** Solid badge background + readable text on top of it. */
  badge: string;
  /** Ring color for avatars/cards, paired with a `ring-2`/`ring-4` width utility. */
  ring: string;
  /** Just the text color, for numbers shown without a badge background. */
  text: string;
  /** Subtle corner-to-corner gradient for a "player card" banner behind a profile header. */
  banner: string;
}

export const RATING_TIER_STYLES: Record<RatingTier, RatingTierStyle> = {
  elite: {
    badge: "bg-amber-400 text-amber-950",
    ring: "ring-amber-400",
    text: "text-amber-500 dark:text-amber-400",
    banner: "bg-gradient-to-br from-amber-400/25 via-amber-400/5 to-transparent",
  },
  great: {
    badge: "bg-primary text-primary-foreground",
    ring: "ring-primary",
    text: "text-primary",
    banner: "bg-gradient-to-br from-primary/25 via-primary/5 to-transparent",
  },
  good: {
    badge: "bg-sky-500 text-white",
    ring: "ring-sky-500",
    text: "text-sky-600 dark:text-sky-400",
    banner: "bg-gradient-to-br from-sky-500/25 via-sky-500/5 to-transparent",
  },
  average: {
    badge: "bg-muted text-muted-foreground",
    ring: "ring-border",
    text: "text-muted-foreground",
    banner: "bg-gradient-to-br from-muted to-transparent",
  },
};

export function ratingStyle(overall?: number | null): RatingTierStyle {
  return RATING_TIER_STYLES[getRatingTier(overall)];
}
