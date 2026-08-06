import { prisma } from "@/lib/prisma";

/**
 * Categories are a simple named bucket a squad optionally belongs to
 * (Squad.categoryId, nullable). There's no real "Outros" row — a squad
 * with no categoryId is just displayed under that label by the UI, and
 * deleting a category relies on the FK's onDelete: SetNull to put its
 * squads there automatically (see schema.prisma's comment on Squad).
 */
export const categoryService = {
  /**
   * Dashboard personalizável (etapa 9 complementar, §1/§3/§4) — `order`
   * null (nunca arrastado, ou depois de "Restaurar ordem automática")
   * cai pro final, ordenado alfabeticamente entre si (o comportamento de
   * sempre); uma vez que o usuário arrasta um grupo, ele ganha um
   * `order` e passa a vir antes de qualquer grupo ainda não-arrastado.
   */
  async listCategories() {
    return prisma.category.findMany({
      orderBy: [{ order: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    });
  },

  /** Grava a ordem exibida (índice da lista) em cada categoria — a lista inteira é reenviada a cada drag, então não precisa de diff/posições fracionárias. */
  async reorderCategories(orderedIds: string[]) {
    await prisma.$transaction(orderedIds.map((id, index) => prisma.category.update({ where: { id }, data: { order: index } })));
  },

  /** "Restaurar ordem automática" (§4) — volta pro alfabético, sem apagar categoria nenhuma. */
  async resetOrder() {
    await prisma.category.updateMany({ data: { order: null } });
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
