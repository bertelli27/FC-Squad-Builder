import Link from "next/link";
import { ChevronLeft, FlagIcon } from "lucide-react";
import { squadService } from "@/services/squad.service";
import { SquadDirectoryList } from "@/components/management/squad-directory-list";

export const dynamic = "force-dynamic";

/** Etapa 10.1 (§Parte 10) — navegação/consulta das seleções já cadastradas; criar uma seleção nova continua em "Criar elenco" (Modo Clubes, aba Seleção). */
export default async function ManagementNationalTeamsPage() {
  const nationalTeams = await squadService.listForManagement("nationalTeam");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/management" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ChevronLeft className="size-4" />
        Gerenciamento
      </Link>

      <div className="flex items-center gap-2">
        <FlagIcon className="text-primary size-6" />
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Seleções <span className="text-muted-foreground text-lg font-normal">({nationalTeams.length})</span>
        </h1>
      </div>

      <SquadDirectoryList
        squads={nationalTeams}
        emptyLabel='Nenhuma seleção ainda — crie uma em "Criar elenco", aba Seleção.'
      />
    </div>
  );
}
