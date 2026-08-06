"use client";

import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

/**
 * Dashboard personalizável (etapa 9 complementar, §1/§5) — cabeçalho do
 * grupo (categoria) arrastável para reordenar os grupos entre si. "Outros"
 * (squads sem categoria) não é uma Category de verdade no banco — não tem
 * onde persistir uma ordem — então é renderizado por SquadListClient sem
 * este wrapper, sempre fixo por último.
 */
export function SortableGroupHeader({ categoryId, label, count }: { categoryId: string; label: string; count: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: categoryId,
    data: { type: "group" },
  });

  return (
    <h2
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "font-heading text-muted-foreground flex w-fit cursor-grab items-center gap-1.5 text-sm font-semibold tracking-wide uppercase active:cursor-grabbing",
        isDragging && "z-10 opacity-50",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="text-muted-foreground/50 size-3.5" />
      {label} <span className="normal-case">({count})</span>
    </h2>
  );
}
