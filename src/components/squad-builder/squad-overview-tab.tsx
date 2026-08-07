import { TrophyIcon, CalendarIcon, UserRoundIcon, HourglassIcon } from "lucide-react";
import { Stat } from "@/components/ui/profile-field";
import { CurrentPlayersCard, type CurrentPlayerData } from "./current-players-card";

/**
 * Etapa 10.3 (§3/§4) — só indicadores de resumo (títulos/temporadas/
 * último técnico/última temporada, os 4 do pedido), mais uma faixa
 * compacta de "jogadores atuais" quando existir (§20 — único jeito de
 * saber quem está num clube que ainda não tem nenhuma temporada). Os
 * campos cadastrais (país/cidade/fundação/estádio/...) saíram daqui pro
 * cabeçalho da página; a contagem de jogadores no histórico e a lista
 * cheia de elenco histórico saíram de vez (duplicavam Temporadas).
 */
export function SquadOverviewTab({
  isNationalTeam,
  titlesCount,
  seasonsCount,
  lastCoachName,
  lastSeasonLabel,
  currentPlayers,
}: {
  isNationalTeam: boolean;
  titlesCount: number;
  seasonsCount: number;
  lastCoachName: string | null;
  lastSeasonLabel: string | null;
  currentPlayers: CurrentPlayerData[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={TrophyIcon} label="Títulos" value={titlesCount} />
        <Stat icon={CalendarIcon} label={isNationalTeam ? "Convocações" : "Temporadas"} value={seasonsCount} />
        {lastCoachName && <Stat icon={UserRoundIcon} label="Último técnico" value={lastCoachName} />}
        {lastSeasonLabel && (
          <Stat
            icon={HourglassIcon}
            label={isNationalTeam ? "Última convocação" : "Última temporada"}
            value={lastSeasonLabel}
          />
        )}
      </div>

      <CurrentPlayersCard players={currentPlayers} />
    </div>
  );
}
