import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export interface PlayerCardData {
  name: string;
  photoUrl?: string | null;
  position?: string | null;
  club?: string | null;
  overall?: number | null;
  shirtNumber?: number | null;
  isCaptain?: boolean;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function PlayerCard({ player }: { player: PlayerCardData }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Avatar size="lg">
        {player.photoUrl && <AvatarImage src={player.photoUrl} alt={player.name} />}
        <AvatarFallback>{initials(player.name)}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">
          {player.name}
          {player.isCaptain && <span className="text-muted-foreground ml-1">(C)</span>}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {[player.position, player.club].filter(Boolean).join(" · ")}
        </span>
      </div>

      {player.shirtNumber != null && (
        <span className="text-muted-foreground w-6 shrink-0 text-right text-sm tabular-nums">
          {player.shirtNumber}
        </span>
      )}

      {player.overall != null && <Badge variant="secondary">{player.overall}</Badge>}
    </div>
  );
}
