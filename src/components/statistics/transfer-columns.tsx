import Link from "next/link";
import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { ClubBadge } from "@/components/squad-builder/club-badge";
import { formatSeasonLabel, formatMoney } from "@/lib/season";
import type { RankingColumn } from "./ranking-table";

export interface TransferRow {
  id: string;
  type: string;
  playerName: string;
  value: number | null;
  counterpartClub: string | null;
  cachedPlayer: { id: string; name: string; photoUrl: string | null } | null;
  counterpartSquad: { id: string; name: string; logoUrl: string | null } | null;
  season: { startYear: number; squad: { id: string; name: string; logoUrl: string | null; seasonCalendar?: string } };
}

/**
 * Etapa 10.5 (§6.3/§6.4/§10) — colunas compartilhadas entre o ranking de
 * clube (Maiores Compras/Vendas) e o de transferências globais (mesma
 * forma de linha, `Transfer` com `counterpartSquad`/`season.squad`
 * incluídos) — uma implementação só, reaproveitada nos dois lugares.
 */
export function buildTransferColumns(): RankingColumn<TransferRow>[] {
  return [
    {
      key: "player",
      label: "Jogador",
      render: (t) =>
        t.cachedPlayer ? (
          <Link href={`/players/${t.cachedPlayer.id}`} className="flex items-center gap-2 hover:underline">
            <PlayerAvatar src={t.cachedPlayer.photoUrl} name={t.playerName} size="sm" />
            <span className="truncate font-medium">{t.playerName}</span>
          </Link>
        ) : (
          <span className="truncate font-medium">{t.playerName}</span>
        ),
    },
    {
      key: "from",
      label: "Origem",
      hideOnMobile: true,
      render: (t) => renderClub(t.type === "in" ? (t.counterpartSquad?.name ?? t.counterpartClub) : t.season.squad.name, t.type === "in" ? t.counterpartSquad : t.season.squad),
    },
    {
      key: "to",
      label: "Destino",
      hideOnMobile: true,
      render: (t) => renderClub(t.type === "out" ? (t.counterpartSquad?.name ?? t.counterpartClub) : t.season.squad.name, t.type === "out" ? t.counterpartSquad : t.season.squad),
    },
    {
      key: "season",
      label: "Temporada",
      hideOnMobile: true,
      render: (t) => (
        <Link href={`/squads/${t.season.squad.id}`} className="text-muted-foreground text-sm hover:underline">
          {formatSeasonLabel(t.season.startYear, t.season.squad.seasonCalendar ?? "brasileiro")}
        </Link>
      ),
    },
    {
      key: "value",
      label: "Valor",
      align: "right",
      render: (t) => <span className="font-medium">{t.value != null ? formatMoney(t.value) : "—"}</span>,
    },
  ];
}

function renderClub(name: string | null | undefined, squad: { id: string; name: string; logoUrl: string | null } | null | undefined) {
  if (!name) return <span className="text-muted-foreground text-sm">—</span>;
  if (!squad) return <span className="truncate text-sm">{name}</span>;
  return (
    <Link href={`/squads/${squad.id}`} className="flex items-center gap-2 hover:underline">
      <ClubBadge src={squad.logoUrl} name={name} size="sm" />
      <span className="truncate text-sm">{name}</span>
    </Link>
  );
}
