import Image from "next/image";
import { TrophyIcon } from "lucide-react";
import { KIND_OPTIONS, SCOPE_LABELS } from "@/lib/competition-classification";
import { findCountry } from "@/lib/countries";

const KIND_LABELS = Object.fromEntries(KIND_OPTIONS.map((o) => [o.value, o.label]));

export interface CompetitionOverviewData {
  logoUrl: string | null;
  trophyImageUrl: string | null;
  description: string | null;
  kind: string | null;
  scope: string | null;
  organizer: string | null;
  country: string | null;
}

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/** Etapa 10.2 — aba "Visão Geral" da competição: layout read-only, distinto do form de edição da aba "Informações". */
export function CompetitionOverviewTab({ competition }: { competition: CompetitionOverviewData }) {
  const showCountry = competition.scope === "national" || competition.scope === "state";

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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Tipo" value={competition.kind ? KIND_LABELS[competition.kind] : null} />
        <Field label="Abrangência" value={competition.scope ? SCOPE_LABELS[competition.scope] : null} />
        <Field label="Organizador" value={competition.organizer} />
        {showCountry && (
          <Field label="País" value={findCountry(competition.country)?.label ?? competition.country} />
        )}
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
