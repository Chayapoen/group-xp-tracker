import type { ScoreCategoryRow, ScoreItemRow, UserScoreRow } from "@/types/db";

export interface ScoreItemView {
  id: string;
  categoryId: string;
  title: string;
  xp: number;
  sortOrder: number;
  passed: boolean;
}

export interface CategorySummary {
  id: string;
  title: string;
  sortOrder: number;
  earnedXp: number;
  maxXp: number;
  items: ScoreItemView[];
}

export function calculateCategorySummaries(
  categories: ScoreCategoryRow[],
  items: ScoreItemRow[],
  userScores: Pick<UserScoreRow, "item_id" | "passed">[]
): CategorySummary[] {
  const passedByItem = new Map<string, boolean>();
  for (const row of userScores) {
    passedByItem.set(row.item_id, Boolean(row.passed));
  }

  const itemsByCategory = new Map<string, ScoreItemRow[]>();
  for (const item of items) {
    const bucket = itemsByCategory.get(item.category_id);
    if (bucket) bucket.push(item);
    else itemsByCategory.set(item.category_id, [item]);
  }

  return [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((cat) => {
      const catItems = [...(itemsByCategory.get(cat.id) ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((it) => ({
          id: it.id,
          categoryId: it.category_id,
          title: it.title,
          xp: it.xp,
          sortOrder: it.sort_order,
          passed: passedByItem.get(it.id) ?? false,
        }));

      let earnedXp = 0;
      let maxXp = 0;
      for (const it of catItems) {
        maxXp += it.xp;
        if (it.passed) earnedXp += it.xp;
      }

      return {
        id: cat.id,
        title: cat.title,
        sortOrder: cat.sort_order,
        earnedXp,
        maxXp,
        items: catItems,
      };
    });
}

export function calculateTotalXp(summaries: CategorySummary[]): number {
  let total = 0;
  for (const s of summaries) {
    total += s.earnedXp;
  }
  return total;
}

export function calculateMaxTotalXp(summaries: CategorySummary[]): number {
  let total = 0;
  for (const s of summaries) {
    total += s.maxXp;
  }
  return total;
}
