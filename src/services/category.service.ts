import { prisma } from "@/lib/prisma";

/**
 * Categories are a simple named bucket a squad optionally belongs to
 * (Squad.categoryId, nullable). There's no real "Outros" row — a squad
 * with no categoryId is just displayed under that label by the UI, and
 * deleting a category relies on the FK's onDelete: SetNull to put its
 * squads there automatically (see schema.prisma's comment on Squad).
 */
export const categoryService = {
  async listCategories() {
    return prisma.category.findMany({ orderBy: { name: "asc" } });
  },

  async createCategory(name: string) {
    const trimmed = name.trim();
    return prisma.category.upsert({
      where: { name: trimmed },
      create: { name: trimmed },
      update: {},
    });
  },

  async renameCategory(id: string, name: string) {
    return prisma.category.update({ where: { id }, data: { name: name.trim() } });
  },

  /** Squads in this category fall back to "Outros" (categoryId becomes null) via the FK's onDelete: SetNull — no extra query needed here. */
  async deleteCategory(id: string) {
    await prisma.category.delete({ where: { id } });
  },
};
