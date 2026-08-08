import { UserRoundIcon, TrophyIcon, UsersRoundIcon, ShieldIcon, FlagIcon } from "lucide-react";
import { playerDataService } from "@/services/player-data.service";
import { competitionService } from "@/services/competition.service";
import { coachService } from "@/services/coach.service";
import { squadService } from "@/services/squad.service";
import { DashboardCard } from "@/components/ui/dashboard-card";

export const dynamic = "force-dynamic";

export default async function ManagementPage() {
  const [players, competitions, coaches, clubs, nationalTeams] = await Promise.all([
    playerDataService.listCustomPlayers(),
    competitionService.listCompetitions(),
    coachService.listCoaches(),
    squadService.listForManagement("club"),
    squadService.listForManagement("nationalTeam"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Gerenciamento</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard
          href="/management/clubs"
          icon={<ShieldIcon className="text-primary size-5" />}
          title="Clubes"
          description="Navegue pelos clubes já cadastrados"
          count={`${clubs.length} ${clubs.length === 1 ? "clube" : "clubes"}`}
          actionLabel="Ver clubes"
        />
        <DashboardCard
          href="/management/national-teams"
          icon={<FlagIcon className="text-primary size-5" />}
          title="Seleções"
          description="Navegue pelas seleções já cadastradas"
          count={`${nationalTeams.length} ${nationalTeams.length === 1 ? "seleção" : "seleções"}`}
          actionLabel="Ver seleções"
        />
        <DashboardCard
          href="/management/players"
          icon={<UserRoundIcon className="text-primary size-5" />}
          title="Jogadores"
          description="Gerencie os jogadores criados por você"
          count={`${players.length} ${players.length === 1 ? "jogador" : "jogadores"}`}
          actionLabel="Gerenciar jogadores"
        />
        <DashboardCard
          href="/management/competitions"
          icon={<TrophyIcon className="text-primary size-5" />}
          title="Competições"
          description="Logo, troféu, classificação e histórico de campeões"
          count={`${competitions.length} ${competitions.length === 1 ? "competição" : "competições"}`}
          actionLabel="Gerenciar competições"
        />
        <DashboardCard
          href="/management/coaches"
          icon={<UsersRoundIcon className="text-primary size-5" />}
          title="Técnicos"
          description="Gerencie os técnicos criados por você"
          count={`${coaches.length} ${coaches.length === 1 ? "técnico" : "técnicos"}`}
          actionLabel="Gerenciar técnicos"
        />
      </div>
    </div>
  );
}
