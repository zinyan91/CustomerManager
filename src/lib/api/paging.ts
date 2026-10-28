// PostgREST trả tối đa 1000 dòng mỗi lần; đọc theo trang để tổng hợp không bị cắt mà không báo.
export const PAGE_SIZE = 1000;

export async function allPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data || []) as T[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
