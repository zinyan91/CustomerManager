import type { OfficialDocFilter } from '../../types/officialDoc';
import { escapeLike, searchTokens } from './normalize';

export const PAGE_SIZE = 15;

/** Phần của chuỗi truy vấn PostgREST mà bộ lọc cần dùng. */
interface FilterChain {
  eq(column: string, value: unknown): FilterChain;
  gt(column: string, value: unknown): FilterChain;
  gte(column: string, value: unknown): FilterChain;
  lt(column: string, value: unknown): FilterChain;
  lte(column: string, value: unknown): FilterChain;
  ilike(column: string, pattern: string): FilterChain;
  or(filters: string): FilterChain;
}

/** Áp bộ lọc lên truy vấn. `today` truyền vào (dùng todayIso()) để tình trạng khớp với giao diện. */
export function applyDocFilters<Q>(query: Q, filter: OfficialDocFilter, today: string): Q {
  let q = query as unknown as FilterChain;

  for (const token of searchTokens(filter.search)) {
    q = q.ilike('SearchText', `%${escapeLike(token)}%`);
  }
  if (filter.category !== 'all') q = q.eq('Category', filter.category);

  if (filter.status === 'upcoming') {
    q = q.gt('EffectiveFrom', today);
  } else if (filter.status === 'expired') {
    q = q.lt('EffectiveTo', today);
  } else if (filter.status === 'active') {
    q = q.lte('EffectiveFrom', today).or(`EffectiveTo.is.null,EffectiveTo.gte.${today}`);
  }

  if (filter.issuedFrom) q = q.gte('IssuedDate', filter.issuedFrom);
  if (filter.issuedTo) q = q.lte('IssuedDate', filter.issuedTo);

  return q as unknown as Q;
}

/** Khoảng dòng (đóng hai đầu, tính từ 0) của một trang, dùng cho `.range()`. */
export function pageRange(page: number): [number, number] {
  const p = Math.max(1, Math.floor(page) || 1);
  const from = (p - 1) * PAGE_SIZE;
  return [from, from + PAGE_SIZE - 1];
}
