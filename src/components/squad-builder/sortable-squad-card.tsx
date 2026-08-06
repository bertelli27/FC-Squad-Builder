"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SquadCard, type SquadCardData } from "./squad-card";

/**
 * Dashboard personalizável (etapa 9 complementar, §2/§5) — mesmo card de
 * sempre, só que arrastável dentro do seu grupo. Os listeners vão no card
 * inteiro (não um "grip" à parte): o `PointerSensor` do DndContext pai usa
 * `activationConstraint: { distance: 8 }`, então um clique normal (sem
 * arrastar) continua virando clique de verdade — no link do nome, na
 * estrela de favorito, no menu — em vez de iniciar um drag.
 */
export function SortableSquadCard({
  squad,
  groupKey,
  onToggleFavorite,
}: {
  squad: SquadCardData;
  groupKey: string;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: squad.id,
    data: { type: "squad", groupKey },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "z-10 opacity-40" : undefined}
      {...attributes}
      {...listeners}
    >
      <SquadCard squad={squad} onToggleFavorite={onToggleFavorite} />
    </div>
  );
}
