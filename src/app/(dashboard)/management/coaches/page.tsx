import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { coachService } from "@/services/coach.service";
import { ManagementCoachesClient } from "@/components/management/management-coaches-client";

export const dynamic = "force-dynamic";

export default async function ManagementCoachesPage() {
  const coaches = await coachService.listCoachesWithClubs();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/management"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        Gerenciamento
      </Link>

      <div className="flex items-baseline gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Técnicos</h1>
        {coaches.length > 0 && <span className="text-muted-foreground text-sm">({coaches.length})</span>}
      </div>

      <ManagementCoachesClient coaches={coaches} />
    </div>
  );
}
