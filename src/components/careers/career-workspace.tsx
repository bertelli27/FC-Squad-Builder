"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, ArrowRightLeftIcon, TrophyIcon, XIcon, ShieldHalfIcon, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatSeasonLabel, formatMoney } from "@/lib/season";
import { stintTotals } from "@/lib/career";
import { AddStintDialog } from "./add-stint-dialog";
import { AddCareerTransferDialog } from "./add-career-transfer-dialog";
import { ClubStintCard } from "./club-stint-card";
import { NationalTeamStintCard } from "./national-team-stint-card";
import type { CareerCompetitionStatsVM, CareerStintVM, CareerTitleVM, CareerTransferVM } from "./types";

const ALL_TEAMS = "__all__";
type Tab = "overview" | "clubs" | "nationalTeam" | "timeline";
type TrophyView = "combined" | "separated";

export function CareerWorkspace({
  careerId,
  dateOfBirth,
  initialStints,
  initialTransfers,
}: {
  careerId: string;
  /** §19 — recomputes each stint's age (below) when the player's date of birth is edited, instead of a stored per-stint age. */
  dateOfBirth?: string | null;
  initialStints: CareerStintVM[];
  initialTransfers: CareerTransferVM[];
}) {
  const [stints, setStints] = useState(initialStints);
  const [transfers, setTransfers] = useState(initialTransfers);
  const [filter, setFilter] = useState(ALL_TEAMS);
  const [tab, setTab] = useState<Tab>("overview");
  const [trophyView, setTrophyView] = useState<TrophyView>("combined");
  const [addClubStintOpen, setAddClubStintOpen] = useState(false);
  const [addNationalStintOpen, setAddNationalStintOpen] = useState(false);
  const [addTransferOpen, setAddTransferOpen] = useState(false);

  const teams = useMemo(() => [...new Set(stints.map((s) => s.clubName))], [stints]);
  const clubTeams = useMemo(
    () => [...new Set(stints.filter((s) => s.kind !== "nationalTeam").map((s) => s.clubName))],
    [stints],
  );
  const nationalTeams = useMemo(
    () => [...new Set(stints.filter((s) => s.kind === "nationalTeam").map((s) => s.clubName))],
    [stints],
  );

  const filteredStints = filter === ALL_TEAMS ? stints : stints.filter((s) => s.clubName === filter);
  const filteredClubStints = filteredStints.filter((s) => s.kind !== "nationalTeam");
  const filteredNationalStints = filteredStints.filter((s) => s.kind === "nationalTeam");

  const totals = useMemo(
    () =>
      filteredStints.reduce(
        (acc, s) => {
          const t = stintTotals(s);
          return {
            appearances: acc.appearances + t.appearances,
            goals: acc.goals + t.goals,
            assists: acc.assists + t.assists,
          };
        },
        { appearances: 0, goals: 0, assists: 0 },
      ),
    [filteredStints],
  );

  // CORREÇÃO — uma temporada da carreira é o ANO, não a CareerStint: um
  // jogador pode ter uma passagem de clube E uma de seleção no mesmo ano
  // (ex: Coritiba 2019 + Brasil 2019), e isso sempre foi contado como 2
  // temporadas em vez de 1. CareerStint continua existindo uma por
  // passagem (nada é fundido/apagado) — isso só agrupa pra contagem/
  // apresentação, por `startYear`. Ver §21/§22 da correção.
  const seasonsByYear = useMemo(() => {
    const byYear = new Map<number, CareerStintVM[]>();
    for (const stint of filteredStints) {
      const list = byYear.get(stint.startYear) ?? [];
      list.push(stint);
      byYear.set(stint.startYear, list);
    }
    return [...byYear.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, yearStints]) => ({ year, stints: yearStints.slice().sort((a, b) => a.order - b.order) }));
  }, [filteredStints]);

  // §13/§14: titles grouped by team (separated) or flattened across every
  // team (combined) — both always derived from filteredStints, so they
  // already respect the "toda a carreira"/per-team filter too.
  const titlesByTeam = useMemo(() => {
    const byTeam = new Map<string, Map<string, { competition: CareerTitleVM["competition"]; count: number }>>();
    for (const stint of filteredStints) {
      if (stint.titles.length === 0) continue;
      const teamMap = byTeam.get(stint.clubName) ?? new Map();
      for (const title of stint.titles) {
        const entry = teamMap.get(title.competition.id);
        if (entry) entry.count += 1;
        else teamMap.set(title.competition.id, { competition: title.competition, count: 1 });
      }
      byTeam.set(stint.clubName, teamMap);
    }
    return [...byTeam.entries()].map(([team, comps]) => ({
      team,
      titles: [...comps.values()].sort((a, b) => b.count - a.count),
    }));
  }, [filteredStints]);

  const titleCountsCombined = useMemo(() => {
    const byCompetition = new Map<string, { competition: CareerTitleVM["competition"]; count: number }>();
    for (const { titles } of titlesByTeam) {
      for (const { competition, count } of titles) {
        const entry = byCompetition.get(competition.id);
        if (entry) entry.count += count;
        else byCompetition.set(competition.id, { competition, count });
      }
    }
    return [...byCompetition.values()].sort((a, b) => b.count - a.count);
  }, [titlesByTeam]);

  function updateStintLocal(stintId: string, patch: Partial<CareerStintVM>) {
    setStints((prev) => prev.map((s) => (s.id === stintId ? { ...s, ...patch } : s)));
  }

  async function handleRemoveStint(stint: CareerStintVM, confirm: ReturnType<typeof useConfirmDialog>["confirm"]) {
    const label =
      stint.kind === "nationalTeam"
        ? `o ano de ${formatSeasonLabel(stint.startYear, stint.calendar)} pela ${stint.clubName}`
        : `a passagem por ${stint.clubName} (${formatSeasonLabel(stint.startYear, stint.calendar)})`;
    const ok = await confirm({ title: `Remover ${label}?`, confirmLabel: "Remover", destructive: true });
    if (!ok) return;

    setStints((prev) => prev.filter((s) => s.id !== stint.id));
    const res = await fetch(`/api/careers/${careerId}/stints/${stint.id}`, { method: "DELETE" });
    if (!res.ok) {
      setStints((prev) => [...prev, stint]);
      toast.error("Não foi possível remover.");
    }
  }

  async function handleRemoveTransfer(
    transfer: CareerTransferVM,
    confirm: ReturnType<typeof useConfirmDialog>["confirm"],
  ) {
    const ok = await confirm({
      title: `Remover a transferência para ${transfer.toClubName}?`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;

    setTransfers((prev) => prev.filter((t) => t.id !== transfer.id));
    const res = await fetch(`/api/careers/${careerId}/transfers/${transfer.id}`, { method: "DELETE" });
    if (!res.ok) {
      setTransfers((prev) => [...prev, transfer]);
      toast.error("Não foi possível remover a transferência.");
    }
  }


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
          <SelectTrigger className="w-52">
            <SelectValue>{(v: string) => (v === ALL_TEAMS ? "Toda a carreira" : v)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TEAMS}>Toda a carreira</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team} value={team}>
                {team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddTransferOpen(true)}>
            <ArrowRightLeftIcon className="size-4" />
            Transferência
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAddNationalStintOpen(true)}>
            <ShieldHalfIcon className="size-4" />
            Ano na seleção
          </Button>
          <Button size="sm" onClick={() => setAddClubStintOpen(true)}>
            <CalendarPlus className="size-4" />
            Nova passagem
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => v && setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="clubs">Clubes</TabsTrigger>
          <TabsTrigger value="nationalTeam">Seleção</TabsTrigger>
          <TabsTrigger value="timeline">Linha do tempo</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && (
        <div className="flex flex-col gap-6">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-3 [.border-b]:pb-3">
              <CardTitle className="text-base">
                {filter === ALL_TEAMS ? "Visão geral da carreira" : `Visão geral — ${filter}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 py-4">
              <div className="flex flex-wrap gap-6">
                <Stat label="Jogos" value={totals.appearances} />
                <Stat label="Gols" value={totals.goals} />
                <Stat label="Assistências" value={totals.assists} />
                <Stat label="Temporadas" value={seasonsByYear.length} />
              </div>

              {filter === ALL_TEAMS && (
                <div className="flex flex-wrap gap-8 border-t pt-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground font-heading text-xs font-semibold tracking-wide uppercase">
                      Clubes
                    </span>
                    {clubTeams.length === 0 ? (
                      <span className="text-muted-foreground text-sm">—</span>
                    ) : (
                      <span className="text-sm">{clubTeams.join(", ")}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground font-heading text-xs font-semibold tracking-wide uppercase">
                      Seleção
                    </span>
                    {nationalTeams.length === 0 ? (
                      <span className="text-muted-foreground text-sm">—</span>
                    ) : (
                      <span className="text-sm">{nationalTeams.join(", ")}</span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-3 [.border-b]:pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="text-primary size-4" />
                Temporadas ({seasonsByYear.length})
              </CardTitle>
            </CardHeader>
            <CardContent className={seasonsByYear.length === 0 ? "py-4" : "flex flex-col divide-y py-0"}>
              {seasonsByYear.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma temporada registrada.</p>}
              {seasonsByYear.map(({ year, stints: yearStints }) => (
                <div key={year} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="font-heading w-14 shrink-0 text-lg font-bold">{year}</span>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {yearStints.map((stint) => {
                      const t = stintTotals(stint);
                      return (
                        <Link
                          key={stint.id}
                          href={`/careers/${careerId}/stints/${stint.id}`}
                          className="bg-muted/40 hover:bg-accent/60 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm transition-colors"
                        >
                          {stint.clubLogoUrl ? (
                            <Image
                              src={stint.clubLogoUrl}
                              alt=""
                              width={20}
                              height={20}
                              className="size-5 shrink-0 object-contain"
                              unoptimized
                            />
                          ) : (
                            <ShieldHalfIcon className="text-muted-foreground size-5 shrink-0" strokeWidth={1.25} />
                          )}
                          <span className="font-medium">{stint.clubName}</span>
                          <span className="text-muted-foreground text-xs">
                            {t.appearances}J {t.goals}G {t.assists}A
                          </span>
                        </Link>
                      );
                    })}
                    {/* Taças conquistadas nesse ano — todas as passagens do
                        ano somadas (normalmente uma só, mas um ano com
                        clube+seleção soma as duas), pra saber de relance em
                        qual ano cada título veio, sem abrir a passagem. */}
                    {yearStints
                      .flatMap((stint) => stint.titles)
                      .map((title) => (
                        <span key={title.id} title={title.competition.name} className="shrink-0">
                          {title.competition.trophyImageUrl ? (
                            <Image
                              src={title.competition.trophyImageUrl}
                              alt={title.competition.name}
                              width={24}
                              height={24}
                              className="size-6 object-contain"
                              unoptimized
                            />
                          ) : (
                            <TrophyIcon className="text-muted-foreground size-6" strokeWidth={1.25} />
                          )}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="flex-row items-center justify-between border-b py-3 [.border-b]:pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrophyIcon className="text-primary size-4" />
                Títulos
              </CardTitle>
              {filter === ALL_TEAMS && titlesByTeam.length > 1 && (
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    variant={trophyView === "combined" ? "default" : "outline"}
                    onClick={() => setTrophyView("combined")}
                  >
                    Todos juntos
                  </Button>
                  <Button
                    size="xs"
                    variant={trophyView === "separated" ? "default" : "outline"}
                    onClick={() => setTrophyView("separated")}
                  >
                    Por equipe
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4 py-4">
              {titlesByTeam.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum título registrado.</p>
              ) : trophyView === "combined" || filter !== ALL_TEAMS ? (
                <TrophyList entries={titleCountsCombined} />
              ) : (
                titlesByTeam.map(({ team, titles }) => (
                  <div key={team} className="flex flex-col gap-1.5">
                    <h3 className="font-heading text-sm font-semibold">{team}</h3>
                    <TrophyList entries={titles} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "clubs" &&
        (filteredClubStints.length === 0 ? (
          <EmptyState label="Nenhuma passagem por clube registrada ainda." />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredClubStints
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((stint) => (
                <ClubStintCard
                  key={stint.id}
                  careerId={careerId}
                  stint={stint}
                  dateOfBirth={dateOfBirth}
                  onTitleAdded={(title) => updateStintLocal(stint.id, { titles: [...stint.titles, title] })}
                  onTitleRemoved={(titleId) =>
                    updateStintLocal(stint.id, { titles: stint.titles.filter((t) => t.id !== titleId) })
                  }
                  onUpdated={(patch) => updateStintLocal(stint.id, patch)}
                  onRemove={handleRemoveStint}
                />
              ))}
          </div>
        ))}

      {tab === "nationalTeam" &&
        (filteredNationalStints.length === 0 ? (
          <EmptyState label="Nenhum ano pela seleção registrado ainda." />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredNationalStints
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((stint) => (
                <NationalTeamStintCard
                  key={stint.id}
                  careerId={careerId}
                  stint={stint}
                  dateOfBirth={dateOfBirth}
                  onTitleAdded={(title) => updateStintLocal(stint.id, { titles: [...stint.titles, title] })}
                  onTitleRemoved={(titleId) =>
                    updateStintLocal(stint.id, { titles: stint.titles.filter((t) => t.id !== titleId) })
                  }
                  onStatsAdded={(stats: CareerCompetitionStatsVM) =>
                    updateStintLocal(stint.id, { competitionStats: [...stint.competitionStats, stats] })
                  }
                  onStatsChanged={(statsId, patch) =>
                    updateStintLocal(stint.id, {
                      competitionStats: stint.competitionStats.map((s) => (s.id === statsId ? { ...s, ...patch } : s)),
                    })
                  }
                  onStatsRemoved={(statsId) =>
                    updateStintLocal(stint.id, {
                      competitionStats: stint.competitionStats.filter((s) => s.id !== statsId),
                    })
                  }
                  onUpdated={(patch) => updateStintLocal(stint.id, patch)}
                  onRemove={handleRemoveStint}
                />
              ))}
          </div>
        ))}

      {tab === "timeline" && (
        <TimelineTab
          filter={filter}
          clubStints={filteredClubStints}
          nationalStints={filteredNationalStints}
          transfers={filter === ALL_TEAMS ? transfers : []}
          careerId={careerId}
          dateOfBirth={dateOfBirth}
          updateStintLocal={updateStintLocal}
          handleRemoveStint={handleRemoveStint}
          handleRemoveTransfer={handleRemoveTransfer}
        />
      )}

      <AddStintDialog
        careerId={careerId}
        kind="club"
        open={addClubStintOpen}
        onOpenChange={setAddClubStintOpen}
        onAdded={(stint) =>
          setStints((prev) => [...prev, { ...stint, titles: stint.titles ?? [], competitionStats: stint.competitionStats ?? [] }])
        }
      />
      <AddStintDialog
        careerId={careerId}
        kind="nationalTeam"
        open={addNationalStintOpen}
        onOpenChange={setAddNationalStintOpen}
        onAdded={(stint) =>
          setStints((prev) => [...prev, { ...stint, titles: stint.titles ?? [], competitionStats: stint.competitionStats ?? [] }])
        }
      />
      <AddCareerTransferDialog
        careerId={careerId}
        open={addTransferOpen}
        onOpenChange={setAddTransferOpen}
        onAdded={(transfer) => setTransfers((prev) => [...prev, transfer])}
      />
    </div>
  );
}

function TimelineTab({
  filter,
  clubStints,
  nationalStints,
  transfers,
  careerId,
  dateOfBirth,
  updateStintLocal,
  handleRemoveStint,
  handleRemoveTransfer,
}: {
  filter: string;
  clubStints: CareerStintVM[];
  nationalStints: CareerStintVM[];
  transfers: CareerTransferVM[];
  careerId: string;
  dateOfBirth?: string | null;
  updateStintLocal: (stintId: string, patch: Partial<CareerStintVM>) => void;
  handleRemoveStint: (stint: CareerStintVM, confirm: ReturnType<typeof useConfirmDialog>["confirm"]) => void;
  handleRemoveTransfer: (transfer: CareerTransferVM, confirm: ReturnType<typeof useConfirmDialog>["confirm"]) => void;
}) {
  type TimelineItem =
    | { kind: "stint"; order: number; stint: CareerStintVM }
    | { kind: "transfer"; order: number; transfer: CareerTransferVM };

  const clubTimeline: TimelineItem[] = [
    ...clubStints.map((stint): TimelineItem => ({ kind: "stint", order: stint.order, stint })),
    ...transfers.map((transfer): TimelineItem => ({ kind: "transfer", order: transfer.order, transfer })),
  ].sort((a, b) => a.order - b.order);

  const nationalTimeline = nationalStints.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {clubTimeline.length === 0 ? (
          <EmptyState label="Nenhuma passagem por clube registrada ainda." />
        ) : (
          clubTimeline.map((item) =>
            item.kind === "stint" ? (
              <ClubStintCard
                key={item.stint.id}
                careerId={careerId}
                stint={item.stint}
                dateOfBirth={dateOfBirth}
                onTitleAdded={(title) => updateStintLocal(item.stint.id, { titles: [...item.stint.titles, title] })}
                onTitleRemoved={(titleId) =>
                  updateStintLocal(item.stint.id, { titles: item.stint.titles.filter((t) => t.id !== titleId) })
                }
                onUpdated={(patch) => updateStintLocal(item.stint.id, patch)}
                onRemove={handleRemoveStint}
              />
            ) : (
              <TransferConnector key={item.transfer.id} transfer={item.transfer} onRemove={handleRemoveTransfer} />
            ),
          )
        )}
      </div>

      {(filter !== "__all__" ? nationalTimeline.length > 0 : true) && (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading flex items-center gap-2 text-lg font-semibold tracking-tight">
            <ShieldHalfIcon className="text-primary size-5" />
            Seleção
          </h2>
          {nationalTimeline.length === 0 ? (
            <EmptyState label="Nenhum ano pela seleção registrado ainda." />
          ) : (
            <div className="flex flex-col gap-3">
              {nationalTimeline.map((stint) => (
                <NationalTeamStintCard
                  key={stint.id}
                  careerId={careerId}
                  stint={stint}
                  dateOfBirth={dateOfBirth}
                  onTitleAdded={(title) => updateStintLocal(stint.id, { titles: [...stint.titles, title] })}
                  onTitleRemoved={(titleId) =>
                    updateStintLocal(stint.id, { titles: stint.titles.filter((t) => t.id !== titleId) })
                  }
                  onStatsAdded={(stats: CareerCompetitionStatsVM) =>
                    updateStintLocal(stint.id, { competitionStats: [...stint.competitionStats, stats] })
                  }
                  onStatsChanged={(statsId, patch) =>
                    updateStintLocal(stint.id, {
                      competitionStats: stint.competitionStats.map((s) => (s.id === statsId ? { ...s, ...patch } : s)),
                    })
                  }
                  onStatsRemoved={(statsId) =>
                    updateStintLocal(stint.id, {
                      competitionStats: stint.competitionStats.filter((s) => s.id !== statsId),
                    })
                  }
                  onUpdated={(patch) => updateStintLocal(stint.id, patch)}
                  onRemove={handleRemoveStint}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-muted-foreground rounded-xl border border-dashed py-10 text-center text-sm">{label}</p>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-heading text-2xl font-bold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

function TrophyList({ entries }: { entries: { competition: CareerTitleVM["competition"]; count: number }[] }) {
  return (
    <ul className="flex flex-wrap gap-3">
      {entries.map(({ competition, count }) => (
        <li key={competition.id} className="bg-muted/40 flex items-center gap-2 rounded-lg border px-2 py-1.5">
          {competition.trophyImageUrl ? (
            <Image
              src={competition.trophyImageUrl}
              alt={competition.name}
              width={24}
              height={24}
              className="size-6 object-contain"
              unoptimized
            />
          ) : (
            <TrophyIcon className="text-muted-foreground size-6" strokeWidth={1.25} />
          )}
          <span className="text-sm font-medium">
            {competition.name} <span className="text-muted-foreground">×{count}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function TransferConnector({
  transfer,
  onRemove,
}: {
  transfer: CareerTransferVM;
  onRemove: (transfer: CareerTransferVM, confirm: ReturnType<typeof useConfirmDialog>["confirm"]) => void;
}) {
  const { confirm, dialog } = useConfirmDialog();
  return (
    <>
      <div className="group/transfer flex items-center gap-3 px-2">
        <div className="bg-border h-8 w-px shrink-0 self-center" />
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
          <ArrowRightLeftIcon className="text-primary size-4 shrink-0" />
          <span className="font-heading text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Transferência
          </span>
          <span className="min-w-0 flex-1 truncate">
            {transfer.fromClubName ? `${transfer.fromClubName} → ` : ""}
            {transfer.toClubName}
            <span className="text-muted-foreground"> · {transfer.year}</span>
          </span>
          {transfer.value != null && <span className="shrink-0 font-medium">{formatMoney(transfer.value)}</span>}
          <button
            type="button"
            onClick={() => onRemove(transfer, confirm)}
            aria-label="Remover transferência"
            className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover/transfer:opacity-100"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>
      {dialog}
    </>
  );
}
