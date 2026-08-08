import { LandmarkIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/** Etapa 10.6 — cabeçalho do hub `/museum`, mesmo estilo de card dos demais headers do app (ProfileHeader/DashboardCard). */
export function MuseumHero() {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex items-center gap-3 py-4">
        <LandmarkIcon className="text-primary size-8 shrink-0" strokeWidth={1.5} />
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Museu</h1>
          <p className="text-muted-foreground text-sm">
            Recordes, grandes momentos e o Hall da Fama do FC Squad Builder — tudo derivado dos seus próprios dados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
