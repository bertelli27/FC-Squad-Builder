import Link from "next/link";
import { UserRoundIcon, TrophyIcon, UsersRoundIcon, ChevronRightIcon } from "lucide-react";
import { playerDataService } from "@/services/player-data.service";
import { competitionService } from "@/services/competition.service";
import { coachService } from "@/services/coach.service";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ManagementPage() {
  const [players, competitions, coaches] = await Promise.all([
    playerDataService.listCustomPlayers(),
    competitionService.listCompetitions(),
    coachService.listCoaches(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Gerenciamento</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ManagementCard
          href="/management/players"
          icon={<UserRoundIcon className="text-primary size-5" />}
          title="Jogadores"
          description="Gerencie os jogadores criados por você"
          count={`${players.length} ${players.length === 1 ? "jogador" : "jogadores"}`}
          actionLabel="Gerenciar jogadores"
        />
        <ManagementCard
          href="/management/competitions"
          icon={<TrophyIcon className="text-primary size-5" />}
          title="Competições"
          description="Logo, troféu, classificação e histórico de campeões"
          count={`${competitions.length} ${competitions.length === 1 ? "competição" : "competições"}`}
          actionLabel="Gerenciar competições"
        />
        <ManagementCard
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

function ManagementCard({
  href,
  icon,
  title,
  description,
  count,
  actionLabel,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  count: string;
  actionLabel: string;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4 [.border-b]:pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="py-4">
        <span className="text-muted-foreground text-sm">{count}</span>
      </CardContent>
      <CardFooter className="border-t py-3 [.border-t]:pt-3">
        <Button
          render={
            <Link href={href}>
              {actionLabel}
              <ChevronRightIcon className="size-4" />
            </Link>
          }
          nativeButton={false}
          variant="outline"
          className="w-full justify-between"
        />
      </CardFooter>
    </Card>
  );
}
