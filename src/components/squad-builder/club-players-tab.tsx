import Link from "next/link";
import { UsersRoundIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { CountryFlag } from "@/components/ui/country-flag";
import { CurrentPlayersCard, type CurrentPlayerData } from "./current-players-card";

export interface HistoricalPlayerData {
  id: string;
  name: string;
  photoUrl: string | null;
  position: string | null;
  nationality: string | null;
  overall: number | null;
  years: number[];
}

/** Etapa 10.2 — aba "Jogadores": atuais (CurrentPlayersCard, reaproveitado) + todo histórico de elenco já registrado. */
export function ClubPlayersTab({
  currentPlayers,
  allPlayers,
}: {
  currentPlayers: CurrentPlayerData[];
  allPlayers: HistoricalPlayerData[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <CurrentPlayersCard players={currentPlayers} />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-3 [.border-b]:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersRoundIcon className="text-primary size-4" />
            Elenco histórico ({allPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          {allPlayers.length === 0 ? (
            <EmptyState label="Nenhum jogador escalado em nenhuma temporada ainda." />
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allPlayers.map((player) => (
                <li key={player.id}>
                  <Link
                    href={`/players/${player.id}`}
                    className="hover:bg-accent/30 flex items-center gap-2 rounded-lg border p-2"
                  >
                    <PlayerAvatar src={player.photoUrl} name={player.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{player.name}</div>
                      <div className="text-muted-foreground flex items-center gap-1 text-xs">
                        <CountryFlag nationality={player.nationality} />
                        {player.position && <span>{player.position}</span>}
                      </div>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {player.years[player.years.length - 1]}–{player.years[0]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
