"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const { confirm, dialog } = useConfirmDialog();

  async function handleDelete() {
    const ok = await confirm({
      title: `Excluir o elenco "${squad.name}"?`,
      description: "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;

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
    <>
      <Card className="group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
        {/* Accent strip: the one purely decorative touch that makes this
            read as a "tile" in a dashboard grid rather than a plain card. */}
        <div className="from-primary to-primary/40 h-1.5 bg-gradient-to-r" />
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2">
            <ClubBadge src={squad.logoUrl} name={squad.name} size="sm" />
            {/* "Stretched link": after:inset-0 makes the whole card
                clickable (positioned relative to Card's `relative`),
                while the delete button below opts back out via its own
                z-10 so it stays independently clickable. */}
            <Link
              href={`/squads/${squad.id}`}
              className="static after:absolute after:inset-0 hover:underline"
            >
              {squad.name}
            </Link>
          </CardTitle>
          <CardAction className="relative z-10 opacity-0 transition-opacity group-hover:opacity-100">
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
        <CardContent className="flex items-center gap-3 pb-4 text-sm">
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {squad.formation}
          </Badge>
          <span className="text-muted-foreground flex items-center gap-1">
            <Users className="size-3.5" />
            {squad.playerCount}
          </span>
        </CardContent>
      </Card>
      {dialog}
    </>
  );
}
