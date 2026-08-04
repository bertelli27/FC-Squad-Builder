"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditCompetitionForm, type EditableCompetition } from "./edit-competition-form";
import { ChampionsTab, type ChampionVM } from "./champions-tab";

/** Etapa 9 (§38) — página própria da competição, com abas em vez de um modal de edição. */
export function CompetitionDetailTabs({
  competition: initialCompetition,
  champions,
}: {
  competition: EditableCompetition;
  champions: ChampionVM[];
}) {
  const [tab, setTab] = useState("info");
  const [competition, setCompetition] = useState(initialCompetition);

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="champions">🏆 Campeões</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "info" && (
        <EditCompetitionForm
          competition={competition}
          onSaved={(patch) => setCompetition((prev) => ({ ...prev, ...patch }))}
        />
      )}
      {tab === "champions" && (
        <ChampionsTab competitionId={competition.id} champions={champions} />
      )}
    </div>
  );
}
