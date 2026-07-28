"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClubBadge } from "./club-badge";

export interface SquadCardData {
  id: string;
  name: string;
  formation: string;
  playerCount: number;
  logoUrl?: string | null;
}

export function SquadCard({ squad }: { squad: SquadCardData }) {
  const router = useRouter();
  const [isDeleting, startDeleting] = useTransition();

  function handleDelete() {
    if (!confirm(`Excluir o elenco "${squad.name}"? Essa ação não pode ser desfeita.`)) return;

    startDeleting(async () => {
      const res = await fetch(`/api/squads/${squad.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Não foi possível excluir o elenco.");
        return;
      }
      toast.success(`Elenco "${squad.name}" excluído.`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClubBadge src={squad.logoUrl} name={squad.name} size="sm" />
          <Link href={`/squads/${squad.id}`} className="hover:underline">
            {squad.name}
          </Link>
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Excluir elenco"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">{squad.formation}</Badge>
      </CardContent>
      <CardFooter className="text-muted-foreground text-sm">
        {squad.playerCount} {squad.playerCount === 1 ? "jogador" : "jogadores"}
      </CardFooter>
    </Card>
  );
}
