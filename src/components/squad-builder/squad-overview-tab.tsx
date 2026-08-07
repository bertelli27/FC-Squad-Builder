export interface SquadOverviewData {
  fullName: string | null;
  country: string | null;
  city: string | null;
  foundedYear: number | null;
  stadium: string | null;
  colors: string | null;
  confederation: string | null;
  category: { name: string } | null;
  baseKind: string | null;
  seasonCalendar: string;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/** Etapa 10.2 — aba "Visão Geral": campos cadastrais + contadores, tudo já buscado pela página (sem fetch próprio). */
export function SquadOverviewTab({
  squad,
  currentPlayersCount,
  totalPlayersCount,
  seasonsCount,
  titlesCount,
  lastCoachName,
  lastSeasonLabel,
}: {
  squad: SquadOverviewData;
  currentPlayersCount: number;
  totalPlayersCount: number;
  seasonsCount: number;
  titlesCount: number;
  lastCoachName: string | null;
  lastSeasonLabel: string | null;
}) {
  const isNationalTeam = squad.baseKind === "nationalTeam";

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="Nome completo" value={squad.fullName} />
        <Field label="País" value={squad.country} />
        {!isNationalTeam && <Field label="Cidade" value={squad.city} />}
        {isNationalTeam ? (
          <Field label="Confederação" value={squad.confederation} />
        ) : (
          <>
            <Field label="Fundação" value={squad.foundedYear ? String(squad.foundedYear) : null} />
            <Field label="Estádio" value={squad.stadium} />
          </>
        )}
        <Field label="Cores" value={squad.colors} />
        <Field label="Categoria" value={squad.category?.name ?? null} />
      </div>

      <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Jogadores atuais" value={currentPlayersCount} />
        <Stat label="Jogadores no histórico" value={totalPlayersCount} />
        <Stat label={isNationalTeam ? "Convocações" : "Temporadas"} value={seasonsCount} />
        <Stat label="Títulos" value={titlesCount} />
        {lastCoachName && <Field label="Último técnico" value={lastCoachName} />}
        {lastSeasonLabel && (
          <Field label={isNationalTeam ? "Última convocação" : "Última temporada"} value={lastSeasonLabel} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-heading text-xl font-bold">{value}</span>
    </div>
  );
}
