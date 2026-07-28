import { PlayerAvatar } from "@/components/player-card/player-avatar";

export function CoachCard({
  coachName,
  coachPhotoUrl,
  coachExternalLink,
}: {
  coachName?: string | null;
  coachPhotoUrl?: string | null;
  coachExternalLink?: string | null;
}) {
  if (!coachName) return null;

  return (
    <div className="flex w-fit items-center gap-3 rounded-lg border p-3">
      <PlayerAvatar src={coachPhotoUrl} name={coachName} />
      <div className="flex flex-col">
        <span className="text-muted-foreground text-xs">Técnico</span>
        <span className="text-sm font-medium">{coachName}</span>
      </div>
      {coachExternalLink && (
        <a
          href={coachExternalLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary self-start text-xs underline underline-offset-2"
        >
          Ver mais →
        </a>
      )}
    </div>
  );
}
