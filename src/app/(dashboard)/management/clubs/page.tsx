import Link from "next/link";
import { ChevronLeft, ShieldIcon } from "lucide-react";
import { squadService } from "@/services/squad.service";
import { SquadDirectoryList } from "@/components/management/squad-directory-list";

export const dynamic = "force-dynamic";

/** Etapa 10.1 (§Parte 10) — navegação/consulta dos clubes já cadastrados; criar um clube novo continua em "Criar elenco" (Modo Clubes). */
export default async function ManagementClubsPage() {
  const clubs = await squadService.listForManagement("club");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/management" className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm">
        <ChevronLeft className="size-4" />
        Gerenciamento
      </Link>

      <div className="flex items-center gap-2">
        <ShieldIcon className="text-primary size-6" />
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Clubes <span className="text-muted-foreground text-lg font-normal">({clubs.length})</span>
        </h1>
      </div>

      <SquadDirectoryList
        squads={clubs}
        emptyLabel='Nenhum clube ainda — crie um em "Criar elenco".'
      />
    </div>
  );
}
