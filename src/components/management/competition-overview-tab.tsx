import Image from "next/image";
import { TrophyIcon } from "lucide-react";

export interface CompetitionOverviewData {
  logoUrl: string | null;
  trophyImageUrl: string | null;
  description: string | null;
}

/**
 * Etapa 10.2 — aba "Visão Geral" da competição, distinta do form de
 * edição da aba "Informações". Etapa 10.3 (§4): tipo/abrangência/
 * organizador/país saíram daqui — já aparecem no cabeçalho da página,
 * mostrar de novo aqui seria duplicar.
 */
export function CompetitionOverviewTab({ competition }: { competition: CompetitionOverviewData }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          {competition.logoUrl ? (
            <Image src={competition.logoUrl} alt="Logo" width={56} height={56} className="size-14 object-contain" unoptimized />
          ) : (
            <TrophyIcon className="text-muted-foreground size-14" strokeWidth={1.25} />
          )}
          <span className="text-muted-foreground text-xs">Logo</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          {competition.trophyImageUrl ? (
            <Image
              src={competition.trophyImageUrl}
              alt="Troféu"
              width={56}
              height={56}
              className="size-14 object-contain"
              unoptimized
            />
          ) : (
            <TrophyIcon className="text-muted-foreground size-14" strokeWidth={1.25} />
          )}
          <span className="text-muted-foreground text-xs">Troféu</span>
        </div>
      </div>

      {competition.description && (
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">Descrição</span>
          <p className="text-sm whitespace-pre-wrap">{competition.description}</p>
        </div>
      )}
    </div>
  );
}
