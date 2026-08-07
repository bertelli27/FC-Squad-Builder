import Link from "next/link";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { PREFERRED_FOOT_LABELS } from "@/lib/player-body";
import { ageToday } from "@/lib/player-age";

export interface PlayerOverviewData {
  nationality: string | null;
  position: string | null;
  dateOfBirth: Date | string | null;
  heightCm: number | null;
  weightKg: number | null;
  preferredFoot: string | null;
  currentClub: { id: string; name: string; logoUrl: string | null } | null;
  currentNationalTeam: { id: string; name: string; logoUrl: string | null } | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/** Etapa 10.2 — aba "Visão Geral" do jogador: cadastro + totais rápidos, tudo já buscado pela página. */
export function PlayerOverviewTab({
  player,
  totalStats,
}: {
  player: PlayerOverviewData;
  totalStats: { appearances: number; goals: number; assists: number };
}) {
  const age = player.dateOfBirth ? ageToday(player.dateOfBirth) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="País" value={player.nationality} />
        <Field label="Posição" value={player.position} />
        <Field label="Idade" value={age != null ? `${age} anos` : null} />
        <Field label="Altura" value={player.heightCm ? `${player.heightCm} cm` : null} />
        <Field label="Peso" value={player.weightKg ? `${player.weightKg} kg` : null} />
        <Field label="Pé dominante" value={player.preferredFoot ? PREFERRED_FOOT_LABELS[player.preferredFoot] : null} />
      </div>

      <div className="flex flex-wrap gap-6 border-t pt-4">
        {player.currentClub && (
          <div className="flex items-center gap-2">
            <ClubBadge src={player.currentClub.logoUrl} name={player.currentClub.name} />
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Clube atual</span>
              <Link href={`/squads/${player.currentClub.id}`} className="text-sm font-semibold hover:underline">
                {player.currentClub.name}
              </Link>
            </div>
          </div>
        )}
        {player.currentNationalTeam && (
          <div className="flex items-center gap-2">
            <ClubBadge src={player.currentNationalTeam.logoUrl} name={player.currentNationalTeam.name} />
            <div className="flex flex-col">
              <span className="text-muted-foreground text-xs">Seleção atual</span>
              <Link href={`/squads/${player.currentNationalTeam.id}`} className="text-sm font-semibold hover:underline">
                {player.currentNationalTeam.name}
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 border-t pt-4 sm:w-fit">
        <Stat label="Jogos" value={totalStats.appearances} />
        <Stat label="Gols" value={totalStats.goals} />
        <Stat label="Assistências" value={totalStats.assists} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-heading text-xl font-bold">{value}</span>
    </div>
  );
}
