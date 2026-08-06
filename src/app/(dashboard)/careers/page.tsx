import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { careerService } from "@/services/career.service";
import { Button } from "@/components/ui/button";
import { CareerCard } from "@/components/careers/career-card";

// Same reasoning as the home page (§Etapa1): always render whatever
// careers exist right now, never a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function CareersPage() {
  const careers = await careerService.listCareers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Carreiras de jogadores</h1>
          {careers.length > 0 && (
            <span className="text-muted-foreground text-sm">({careers.length})</span>
          )}
        </div>
        <Button
          render={
            <Link href="/careers/new">
              <PlusIcon className="size-4" />
              Criar carreira
            </Link>
          }
          nativeButton={false}
        />
      </div>

      {careers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Você ainda não criou nenhuma carreira.</p>
          <Button render={<Link href="/careers/new">Criar minha primeira carreira</Link>} nativeButton={false} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {careers.map((career) => (
            <CareerCard
              key={career.id}
              career={{
                id: career.id,
                name: career.cachedPlayer?.name ?? career.name,
                photoUrl: career.cachedPlayer?.photoUrl ?? career.photoUrl,
                seasonCount: career.seasonCount,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
