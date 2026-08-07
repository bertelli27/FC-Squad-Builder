import Link from "next/link";
import { RulerIcon, WeightIcon, FootprintsIcon } from "lucide-react";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { Stat } from "@/components/ui/profile-field";
import { PREFERRED_FOOT_LABELS } from "@/lib/player-body";

export interface PlayerOverviewData {
  heightCm: number | null;
  weightKg: number | null;
  preferredFoot: string | null;
  currentClub: { id: string; name: string; logoUrl: string | null } | null;
  currentNationalTeam: { id: string; name: string; logoUrl: string | null } | null;
}

/**
 * Etapa 10.2 — aba "Visão Geral" do jogador: cadastro + totais rápidos.
 * Etapa 10.3 (§4): país/posição/idade saíram daqui — já aparecem no
 * cabeçalho da página, mostrar de novo aqui seria duplicar.
 */
export function PlayerOverviewTab({
  player,
  totalStats,
}: {
  player: PlayerOverviewData;
  totalStats: { appearances: number; goals: number; assists: number };
}) {
  const hasBodyStats = player.heightCm || player.weightKg || player.preferredFoot;

  return (
    <div className="flex flex-col gap-6">
      {hasBodyStats && (
        <div className="grid grid-cols-3 gap-3 sm:w-fit">
          {player.heightCm && <Stat icon={RulerIcon} label="Altura" value={`${player.heightCm} cm`} />}
          {player.weightKg && <Stat icon={WeightIcon} label="Peso" value={`${player.weightKg} kg`} />}
          {player.preferredFoot && (
            <Stat icon={FootprintsIcon} label="Pé dominante" value={PREFERRED_FOOT_LABELS[player.preferredFoot]} />
          )}
        </div>
      )}

      {(player.currentClub || player.currentNationalTeam) && (
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
      )}

      <div className="grid grid-cols-3 gap-3 border-t pt-4 sm:w-fit">
        <Stat label="Jogos" value={totalStats.appearances} />
        <Stat label="Gols" value={totalStats.goals} />
        <Stat label="Assistências" value={totalStats.assists} />
      </div>
    </div>
  );
}
