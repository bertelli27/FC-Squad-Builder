import Link from "next/link";
import { PlayerAvatar } from "@/components/player-card/player-avatar";

export function CoachCard({
  coachId,
  coachName,
  coachPhotoUrl,
  coachExternalLink,
}: {
  coachId?: string | null;
  coachName?: string | null;
  coachPhotoUrl?: string | null;
  coachExternalLink?: string | null;
}) {
  if (!coachName) return null;

  return (
    <div className="flex w-fit items-center gap-3">
      <PlayerAvatar src={coachPhotoUrl} name={coachName} />
      <div className="flex flex-col">
        <span className="text-muted-foreground text-xs">Técnico</span>
        {coachId ? (
          <Link href={`/coaches/${coachId}`} className="font-heading text-sm font-bold hover:underline">
            {coachName}
          </Link>
        ) : (
          <span className="font-heading text-sm font-bold">{coachName}</span>
        )}
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
