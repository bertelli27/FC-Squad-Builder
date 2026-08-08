import {
  Building2Icon,
  TrophyIcon,
  CalendarIcon,
  ListChecksIcon,
  ArrowRightLeftIcon,
  UserRoundIcon,
  UserPlusIcon,
  SparklesIcon,
  TrendingUpIcon,
  LandmarkIcon,
  ShieldIcon,
  ShirtIcon,
  BookOpenIcon,
  CircleDotIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * Etapa 10.4 (§3) — categorias de evento da Timeline. Texto livre no
 * banco (`TimelineEvent.type`) — esta lista é só o vocabulário validado
 * na UI, então adicionar uma categoria nova no futuro não pede migration.
 */
export const TIMELINE_EVENT_TYPES: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "foundation", label: "Fundação", icon: Building2Icon },
  { value: "title", label: "Título", icon: TrophyIcon },
  { value: "season", label: "Temporada", icon: CalendarIcon },
  { value: "competition", label: "Competição", icon: ListChecksIcon },
  { value: "transfer", label: "Transferência", icon: ArrowRightLeftIcon },
  { value: "coach", label: "Técnico", icon: UserRoundIcon },
  { value: "player", label: "Jogador", icon: UserPlusIcon },
  { value: "record", label: "Recorde", icon: SparklesIcon },
  { value: "campaign", label: "Campanha", icon: TrendingUpIcon },
  { value: "stadium", label: "Estádio", icon: LandmarkIcon },
  { value: "crest", label: "Escudo", icon: ShieldIcon },
  { value: "kit", label: "Uniforme", icon: ShirtIcon },
  { value: "history", label: "História", icon: BookOpenIcon },
  { value: "other", label: "Outro", icon: CircleDotIcon },
];

export const TIMELINE_EVENT_TYPE_MAP = new Map(TIMELINE_EVENT_TYPES.map((t) => [t.value, t]));

export function timelineEventTypeLabel(type: string): string {
  return TIMELINE_EVENT_TYPE_MAP.get(type)?.label ?? type;
}

export function timelineEventTypeIcon(type: string): LucideIcon {
  return TIMELINE_EVENT_TYPE_MAP.get(type)?.icon ?? CircleDotIcon;
}

/**
 * Forma compartilhada por evento manual (linha do banco) e automático
 * (calculado na hora a partir de Season/SeasonTitle/Transfer/
 * CompetitionChampion/Season.coachId — nunca persistido, §1/§5). `id` de
 * um automático é sintético e estável (ex: `transfer:${transfer.id}`),
 * nunca colide com um cuid de banco. `sourceType`/`sourceId` (§15)
 * identificam a origem só pra decidir o link de "editar" — automático
 * nunca é editável como se fosse independente (§14), só o registro de
 * origem é.
 */
export interface TimelineEventVM {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  year: number;
  month?: number | null;
  day?: number | null;
  order: number;
  isManual: boolean;
  highlight: boolean;
  imageUrl?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  /** Link discreto pra origem (ex: página da temporada) — só em automáticos, quando fizer sentido. */
  editHref?: string | null;
}

/** §8 — cronológico por ano → mês (evento só-com-ano vem antes dos com mês no mesmo ano) → dia → order → id, pra desempate 100% determinístico. */
export function sortTimelineEvents(events: TimelineEventVM[]): TimelineEventVM[] {
  return [...events].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const am = a.month ?? 0;
    const bm = b.month ?? 0;
    if (am !== bm) return am - bm;
    const ad = a.day ?? 0;
    const bd = b.day ?? 0;
    if (ad !== bd) return ad - bd;
    if (a.order !== b.order) return a.order - b.order;
    return a.id.localeCompare(b.id);
  });
}
