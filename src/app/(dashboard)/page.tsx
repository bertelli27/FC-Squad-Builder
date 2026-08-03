import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { squadService } from "@/services/squad.service";
import { categoryService } from "@/services/category.service";
import { tagService } from "@/services/tag.service";
import { Button } from "@/components/ui/button";
import { SquadListClient } from "@/components/squad-builder/squad-list-client";
import { ImportExportBar } from "@/components/squad-builder/import-export-bar";

// Without this, Next prerenders this page as static HTML at build time
// (it has no params/cookies/etc. to force dynamic rendering on its own) —
// fine for a marketing page, wrong for a private dashboard listing
// whatever squads/logos exist *right now*. That's exactly why an
// uploaded club badge showed correctly on the squad's own page (always
// server-rendered per request) but not here: this route kept serving
// the HTML generated back at deploy time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [squads, categories, tags] = await Promise.all([
    squadService.listSquads(),
    categoryService.listCategories(),
    tagService.listTags(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Meus elencos</h1>
          {squads.length > 0 && (
            <span className="text-muted-foreground text-sm">({squads.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ImportExportBar />
          <Button
            render={
              <Link href="/squads/new">
                <PlusIcon className="size-4" />
                Criar elenco
              </Link>
            }
            nativeButton={false}
          />
        </div>
      </div>

      {squads.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <p className="text-muted-foreground">Você ainda não criou nenhum elenco.</p>
          <Button render={<Link href="/squads/new">Criar meu primeiro elenco</Link>} nativeButton={false} />
        </div>
      ) : (
        <SquadListClient
          squads={squads.map((squad) => {
            const latestSeason = squad.seasons[0];
            return {
              id: squad.id,
              name: squad.name,
              formation: latestSeason?.formation ?? null,
              playerCount: latestSeason?._count.players ?? 0,
              seasonCount: squad._count.seasons,
              logoUrl: squad.logoUrl,
              primaryColor: squad.primaryColor,
              isFavorite: squad.isFavorite,
              categoryId: squad.categoryId,
              categoryName: squad.category?.name ?? null,
              tags: squad.tags,
            };
          })}
          categories={categories}
          tags={tags}
        />
      )}
    </div>
  );
}
