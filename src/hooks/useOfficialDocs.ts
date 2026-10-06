import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OfficialDoc, OfficialDocFilter } from '../types/officialDoc';
import { countByCategory, searchOfficialDocs, type CategoryCounts } from '../lib/api/officialDocApi';
import { PAGE_SIZE } from '../lib/officialDoc/docQuery';

export const INITIAL_DOC_FILTER: OfficialDocFilter = {
  search: '',
  category: 'all',
  status: 'all',
  issuedFrom: '',
  issuedTo: '',
};

const ZERO_COUNTS: CategoryCounts = { all: 0, 'van-ban': 0, 'hop-dong': 0, 'cong-van': 0, khac: 0 };
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Trạng thái màn danh mục văn bản: bộ lọc, trang, kết quả và số lượng từng mục.
 * Ô tìm kiếm được chờ 300ms để không gọi DB sau mỗi phím; đổi bộ lọc luôn về trang 1.
 */
export function useOfficialDocs() {
  const [filter, setFilter] = useState<OfficialDocFilter>(INITIAL_DOC_FILTER);
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);

  const [docs, setDocs] = useState<OfficialDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<CategoryCounts>(ZERO_COUNTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(filter.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filter.search]);

  const { category, status, issuedFrom, issuedTo } = filter;

  // Bộ lọc dùng để đếm từng mục: mọi điều kiện trừ mục
  const countFilter = useMemo<OfficialDocFilter>(
    () => ({ search: appliedSearch, category: 'all', status, issuedFrom, issuedTo }),
    [appliedSearch, status, issuedFrom, issuedTo]
  );
  const query = useMemo<OfficialDocFilter>(() => ({ ...countFilter, category }), [countFilter, category]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    searchOfficialDocs(query, page)
      .then((res) => {
        if (!active) return;
        // Vừa xóa dòng cuối của trang cuối: quay về trang 1 thay vì hiện trang trống
        if (res.outOfRange && page > 1) {
          setPage(1);
          return;
        }
        setDocs(res.docs);
        setTotal(res.total);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setDocs([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : 'Không tìm được văn bản.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query, page, version]);

  useEffect(() => {
    let active = true;
    countByCategory(countFilter)
      .then((res) => {
        if (active) setCounts(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Không đếm được văn bản.');
      });
    return () => {
      active = false;
    };
  }, [countFilter, version]);

  const updateFilter = useCallback((patch: Partial<OfficialDocFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  /** Đặt lại mọi bộ lọc, giữ nguyên mục đang xem. */
  const resetFilters = useCallback(() => {
    setFilter((f) => ({ ...INITIAL_DOC_FILTER, category: f.category }));
    setAppliedSearch('');
    setPage(1);
  }, []);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    filter,
    updateFilter,
    resetFilters,
    page,
    setPage,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    docs,
    total,
    counts,
    loading,
    error,
    reload,
  };
}
