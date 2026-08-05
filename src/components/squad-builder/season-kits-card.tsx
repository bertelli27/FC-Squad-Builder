"use client";

import { useState } from "react";
import Image from "next/image";
import { PencilIcon, PlusIcon, ShirtIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { KIT_TYPES } from "@/lib/kits";
import { KitSlotDialog } from "./kit-slot-dialog";

export interface SeasonKitVM {
  type: string;
  imageUrl: string;
}

/**
 * §1.6 — grid fixo com os 5 tipos de kit sempre visíveis (mesmo os não
 * cadastrados), pra deixar claro quais tipos existem e facilitar adicionar
 * exatamente o que falta — em vez de uma lista que só mostra o que já tem
 * (o que esconderia "Third" como opção se ainda não cadastrado).
 */
export function SeasonKitsCard({ seasonId, kits: initialKits }: { seasonId: string; kits: SeasonKitVM[] }) {
  const [kits, setKits] = useState(initialKits);
  const [openType, setOpenType] = useState<string | null>(null);

  const byType = new Map(kits.map((k) => [k.type, k.imageUrl]));

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShirtIcon className="text-primary size-4" />
          Uniformes da temporada
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {KIT_TYPES.map(({ value, label }) => {
            const imageUrl = byType.get(value) ?? null;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setOpenType(value)}
                className="group/kit border-input bg-muted/20 hover:bg-accent/40 relative flex flex-col items-center gap-1.5 rounded-lg border p-2 transition-colors"
              >
                <div className="bg-background relative aspect-square w-full overflow-hidden rounded-md">
                  {imageUrl ? (
                    <Image src={imageUrl} alt="" fill className="object-contain p-1" unoptimized />
                  ) : (
                    <div className="text-muted-foreground/40 flex size-full items-center justify-center">
                      <PlusIcon className="size-6" />
                    </div>
                  )}
                  <div className="bg-background/90 text-foreground absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full opacity-0 shadow-sm transition-opacity group-hover/kit:opacity-100">
                    <PencilIcon className="size-3" />
                  </div>
                </div>
                <span className="text-muted-foreground text-xs font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>

      {openType && (
        <KitSlotDialog
          key={openType}
          seasonId={seasonId}
          type={openType}
          currentImageUrl={byType.get(openType) ?? null}
          open
          onOpenChange={(next) => !next && setOpenType(null)}
          onSaved={(imageUrl) =>
            setKits((prev) => [...prev.filter((k) => k.type !== openType), { type: openType, imageUrl }])
          }
          onRemoved={() => setKits((prev) => prev.filter((k) => k.type !== openType))}
        />
      )}
    </Card>
  );
}
