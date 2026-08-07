import Link from "next/link";
import Image from "next/image";
import { TrophyIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export interface PalmaresEntry {
  competition: {
    id: string;
    name: string;
    trophyImageUrl: string | null;
  };
  count: number;
}

/** §3: palmarés do clube — sempre a soma dos títulos de cada temporada, nunca um total digitado à parte. */
export function PalmaresCard({ entries }: { entries: PalmaresEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3 [.border-b]:pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrophyIcon className="text-primary size-4" />
          Palmarés
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4">
        <ul className="flex flex-wrap gap-3">
          {entries.map(({ competition, count }) => (
            <li key={competition.id}>
              <Link
                href={`/management/competitions/${competition.id}`}
                className="bg-muted/40 hover:bg-accent/50 flex flex-col items-center gap-1.5 rounded-lg border p-3 pt-2"
              >
                {competition.trophyImageUrl ? (
                  <Image
                    src={competition.trophyImageUrl}
                    alt={competition.name}
                    width={40}
                    height={40}
                    className="size-10 object-contain"
                    unoptimized
                  />
                ) : (
                  <TrophyIcon className="text-muted-foreground size-10" strokeWidth={1.25} />
                )}
                <span className="font-heading max-w-28 text-center text-xs font-semibold leading-tight">
                  {competition.name} <span className="text-muted-foreground">×{count}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
