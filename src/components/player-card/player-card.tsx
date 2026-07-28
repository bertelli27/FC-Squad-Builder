import { PlayerAvatar } from "./player-avatar";
import { OverallBadge } from "./overall-badge";

export interface PlayerCardData {
  name: string;
  photoUrl?: string | null;
  position?: string | null;
  club?: string | null;
  overall?: number | null;
  shirtNumber?: number | null;
  isCaptain?: boolean;
}

export function PlayerCard({ player }: { player: PlayerCardData }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <PlayerAvatar src={player.photoUrl} name={player.name} size="lg" />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-heading truncate text-base font-bold">
          {player.name}
          {player.isCaptain && <span className="text-muted-foreground ml-1">(C)</span>}
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {[player.position, player.club].filter(Boolean).join(" · ")}
        </span>
      </div>

      {player.shirtNumber != null && (
        <span className="font-heading text-foreground w-8 shrink-0 text-right text-lg font-bold tabular-nums">
          {player.shirtNumber}
        </span>
      )}

      <OverallBadge overall={player.overall} />
    </div>
  );
}
