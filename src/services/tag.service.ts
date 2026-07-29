import { prisma } from "@/lib/prisma";

export const tagService = {
  async listTags() {
    return prisma.tag.findMany({ orderBy: { name: "asc" } });
  },

  /** Resolves each name to a Tag row, creating any that don't exist yet. Dedupes by trimmed name. */
  async findOrCreateTags(names: string[]) {
    const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
    return Promise.all(
      unique.map((name) =>
        prisma.tag.upsert({ where: { name }, create: { name }, update: {} }),
      ),
    );
  },
};
