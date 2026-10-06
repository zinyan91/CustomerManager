import type { OfficialDocCategory } from '../../types/officialDoc';

/** Bốn mục của sidebar Văn thư. */
export const OFFICIAL_CATEGORIES: ReadonlyArray<{ id: OfficialDocCategory; label: string }> = [
  { id: 'van-ban', label: 'Văn bản' },
  { id: 'hop-dong', label: 'Hợp đồng' },
  { id: 'cong-van', label: 'Công văn' },
  { id: 'khac', label: 'Khác' },
];

const IDS = new Set<string>(OFFICIAL_CATEGORIES.map((c) => c.id));

export function isCategory(value: string): value is OfficialDocCategory {
  return IDS.has(value);
}

export function categoryLabel(id: OfficialDocCategory): string {
  return OFFICIAL_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
