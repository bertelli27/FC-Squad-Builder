import { PlayerAvatar } from "@/components/player-card/player-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HallOfFameCandidateRow } from "@/services/hall-of-fame.service";

/**
 * Etapa 10.6 (§7/§19) — candidato calculado (nunca persistido). Mostra em
 * quais categorias ele se destaca — nunca sugere que já é membro oficial
 * (§20: ranking não é Hall da Fama). "Adicionar ao Hall da Fama" só abre o
 * diálogo de criação pré-preenchido; a inclusão continua sendo uma decisão
 * manual do usuário (§7: "o usuário continua decidindo").
 */
export function HallOfFameCandidateCard({ candidate, onAdd }: { candidate: HallOfFameCandidateRow; onAdd: () => void }) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex items-center gap-3">
          <PlayerAvatar src={candidate.cachedPlayer.photoUrl} name={candidate.cachedPlayer.name} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-semibold">{candidate.cachedPlayer.name}</span>
            <Badge variant="secondary" className="w-fit">
              Candidato ao Hall da Fama
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {candidate.categories.map((category) => (
            <Badge key={category} variant="outline">
              Top 10 em {category}
            </Badge>
          ))}
        </div>

        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          Adicionar ao Hall da Fama
        </Button>
      </CardContent>
    </Card>
  );
}
