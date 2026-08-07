import { UsersRoundIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { OverallBadge } from "@/components/player-card/overall-badge";
import { CountryFlag } from "@/components/ui/country-flag";

export interface CurrentPlayerData {
  id: string;
  name: string;
  photoUrl: string | null;
  position: string | null;
  nationality: string | null;
  overall: number | null;
}

/**
 * Etapa 10.1 (§3) — jogadores marcados com este clube como "clube atual"
 * (CachedPlayer.currentClubId), independente de qualquer temporada/elenco
 * cadastrado aqui. Só leitura — editar quem é o clube atual de um jogador
 * continua sendo feito pelo cadastro dele (Gerenciamento → Jogadores, ou
 * o perfil dele em qualquer elenco/carreira).
 */
export function CurrentPlayersCard({ players }: { players: CurrentPlayerData[] }) {
  if (players.length === 0) return null;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UsersRoundIcon className="text-primary size-4" />
          Jogadores atuais ({players.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => (
          <div key={player.id} className="flex items-center gap-2 rounded-lg border p-2">
            <PlayerAvatar src={player.photoUrl} name={player.name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{player.name}</div>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <CountryFlag nationality={player.nationality} />
                {player.position && <span>{player.position}</span>}
              </div>
            </div>
            <OverallBadge overall={player.overall} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
