import { Badge } from "@/components/ui/badge";
import { ratingStyle } from "@/lib/rating-tier";
import { cn } from "@/lib/utils";

/** Overall rating badge, colored by EA FC-style tier (gold/green/blue/plain). */
export function OverallBadge({
  overall,
  className,
}: {
  overall?: number | null;
  className?: string;
}) {
  if (overall == null) return null;

  return (
    <Badge variant="outline" className={cn("font-heading border-0 font-bold", ratingStyle(overall).badge, className)}>
      {overall}
    </Badge>
  );
}
