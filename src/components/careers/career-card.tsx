"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlayerAvatar } from "@/components/player-card/player-avatar";

export interface CareerCardData {
  id: string;
  name: string;
  photoUrl: string | null;
  stintCount: number;
}

export function CareerCard({ career }: { career: CareerCardData }) {
  const router = useRouter();
  const [isDeleting, startDeleting] = useTransition();
  const { confirm, dialog } = useConfirmDialog();

  async function handleDelete() {
    const ok = await confirm({
      title: `Excluir a carreira de "${career.name}"?`,
      description: "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;

    startDeleting(async () => {
      const res = await fetch(`/api/careers/${career.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Não foi possível excluir a carreira.");
        return;
      }
      toast.success(`Carreira de "${career.name}" excluída.`);
      router.refresh();
    });
  }

  return (
    <>
      <Card className="group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md">
        <div className="from-primary to-primary/40 h-1.5 bg-gradient-to-r" />
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2">
            <PlayerAvatar src={career.photoUrl} name={career.name} size="sm" />
            <Link
              href={`/careers/${career.id}`}
              className="static after:absolute after:inset-0 hover:underline"
            >
              {career.name}
            </Link>
          </CardTitle>
          <CardAction className="relative z-10">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir carreira"
              disabled={isDeleting}
              onClick={handleDelete}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="size-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex items-center gap-1 pb-4 text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <History className="size-3.5" />
            {career.stintCount} {career.stintCount === 1 ? "passagem" : "passagens"}
          </span>
        </CardContent>
      </Card>
      {dialog}
    </>
  );
}
