/** Hồ sơ của một khách hàng đã có những phần nào. */
export interface CustomerProgress {
  hdtd: boolean;
  kunn: boolean;
  tsdb: boolean;
}

export type ProgressKey = keyof CustomerProgress;

/** Thứ tự và tên các bước hồ sơ hiện trong ô Tiến độ hồ sơ. */
export const PROGRESS_STEPS: ReadonlyArray<{ key: ProgressKey; label: string }> = [
  { key: 'hdtd', label: 'Hợp đồng tín dụng' },
  { key: 'kunn', label: 'Quản lý khoản vay' },
  { key: 'tsdb', label: 'Tài sản bảo đảm' },
];

/** Ghép danh sách mã khách hàng có HĐTD, khoản vay, TSĐB (có thể lặp mã) thành tiến độ từng khách hàng. */
export function buildProgressMap(
  customerIds: number[],
  withHdtd: Iterable<number>,
  withKunn: Iterable<number>,
  withTsdb: Iterable<number>
): Map<number, CustomerProgress> {
  const h = new Set(withHdtd);
  const k = new Set(withKunn);
  const t = new Set(withTsdb);
  return new Map(customerIds.map((id) => [id, { hdtd: h.has(id), kunn: k.has(id), tsdb: t.has(id) }]));
}

/** Số bước đã có trên tổng số bước, vd 2/3. */
export function progressCount(p: CustomerProgress): { done: number; total: number } {
  return { done: PROGRESS_STEPS.filter((s) => p[s.key]).length, total: PROGRESS_STEPS.length };
}
