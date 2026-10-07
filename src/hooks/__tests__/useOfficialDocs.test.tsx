// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { OfficialDoc } from '../../types/officialDoc';

const api = vi.hoisted(() => ({ search: vi.fn(), count: vi.fn() }));

vi.mock('../../lib/api/officialDocApi', () => ({
  searchOfficialDocs: api.search,
  countByCategory: api.count,
}));

import { useOfficialDocs } from '../useOfficialDocs';

const d = (id: string): OfficialDoc => ({
  id, category: 'van-ban', docNumber: `S${id}`, title: `T${id}`,
  issuedDate: '2026-01-01', effectiveFrom: '2026-01-01', effectiveTo: null, files: [], createdAt: '', updatedAt: '',
});

const COUNTS = { all: 3, 'van-ban': 1, 'hop-dong': 1, 'cong-van': 1, khac: 0 };

beforeEach(() => {
  api.search.mockReset();
  api.count.mockReset();
  api.search.mockResolvedValue({ docs: [d('1')], total: 31, outOfRange: false });
  api.count.mockResolvedValue(COUNTS);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useOfficialDocs', () => {
  it('nạp trang 1 và số lượng từng mục khi mở', async () => {
    const { result } = renderHook(() => useOfficialDocs());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.docs.map((x) => x.id)).toEqual(['1']);
    expect(result.current.total).toBe(31);
    expect(result.current.pageCount).toBe(3);
    expect(result.current.counts).toEqual(COUNTS);
    expect(api.search).toHaveBeenCalledWith(expect.objectContaining({ search: '', category: 'all' }), 1, { key: 'issuedDate', dir: 'desc' });
  });

  it('ô tìm kiếm chờ 300ms: gõ nhiều phím chỉ gọi DB một lần với từ khóa cuối', async () => {
    const { result } = renderHook(() => useOfficialDocs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.search.mockClear();
    api.count.mockClear();

    vi.useFakeTimers();
    act(() => result.current.updateFilter({ search: 'l' }));
    act(() => result.current.updateFilter({ search: 'la' }));
    act(() => result.current.updateFilter({ search: 'lai' }));
    expect(api.search).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(api.search).toHaveBeenCalledTimes(1);
    expect(api.search).toHaveBeenCalledWith(expect.objectContaining({ search: 'lai' }), 1, expect.anything());
    expect(api.count).toHaveBeenCalledTimes(1);
    expect(api.count).toHaveBeenCalledWith(expect.objectContaining({ search: 'lai', category: 'all' }));
  });

  it('đổi mục không đếm lại (số lượng không phụ thuộc mục) nhưng tìm lại từ trang 1', async () => {
    const { result } = renderHook(() => useOfficialDocs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setPage(3));
    await waitFor(() => expect(api.search).toHaveBeenLastCalledWith(expect.anything(), 3, expect.anything()));
    api.search.mockClear();
    api.count.mockClear();

    act(() => result.current.updateFilter({ category: 'hop-dong' }));
    await waitFor(() => expect(api.search).toHaveBeenCalledWith(expect.objectContaining({ category: 'hop-dong' }), 1, expect.anything()));
    expect(api.count).not.toHaveBeenCalled();
    expect(result.current.page).toBe(1);
  });

  it('đổi bộ lọc loại, tình trạng, ngày: tìm lại và đếm lại với bộ lọc mới', async () => {
    const { result } = renderHook(() => useOfficialDocs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.count.mockClear();

    act(() => result.current.updateFilter({ status: 'active', issuedFrom: '2026-01-01' }));
    await waitFor(() =>
      expect(api.count).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active', issuedFrom: '2026-01-01' })
      )
    );
  });

  it('đặt lại bộ lọc giữ nguyên mục đang xem', async () => {
    const { result } = renderHook(() => useOfficialDocs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.updateFilter({ category: 'cong-van' }));
    act(() => result.current.resetFilters());
    expect(result.current.filter).toMatchObject({ category: 'cong-van', search: '' });
  });

  it('trang vượt quá số dòng (vừa xóa dòng cuối) thì quay về trang 1', async () => {
    const { result } = renderHook(() => useOfficialDocs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.search.mockResolvedValueOnce({ docs: [], total: 0, outOfRange: true });

    act(() => result.current.setPage(4));
    await waitFor(() => expect(result.current.page).toBe(1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.docs.map((x) => x.id)).toEqual(['1']);
  });

  it('lỗi DB: hiện thông điệp lỗi, danh sách rỗng, không im lặng', async () => {
    api.search.mockRejectedValue(new Error('Không tìm được văn bản: boom'));
    const { result } = renderHook(() => useOfficialDocs());
    await waitFor(() => expect(result.current.error).toBe('Không tìm được văn bản: boom'));
    expect(result.current.docs).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('reload gọi lại cả danh sách và số lượng', async () => {
    const { result } = renderHook(() => useOfficialDocs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    api.search.mockClear();
    api.count.mockClear();

    act(() => result.current.reload());
    await waitFor(() => expect(api.search).toHaveBeenCalledTimes(1));
    expect(api.count).toHaveBeenCalledTimes(1);
  });

  it('kết quả của truy vấn cũ không ghi đè truy vấn mới (đổi bộ lọc nhanh)', async () => {
    let releaseFirst!: (v: unknown) => void;
    api.search.mockReset();
    api.search
      .mockImplementationOnce(() => new Promise((r) => { releaseFirst = r; }))
      .mockResolvedValue({ docs: [d('2')], total: 1, outOfRange: false });

    const { result } = renderHook(() => useOfficialDocs());
    act(() => result.current.updateFilter({ status: 'active' }));
    await waitFor(() => expect(result.current.docs.map((x) => x.id)).toEqual(['2']));

    await act(async () => {
      releaseFirst({ docs: [d('1')], total: 31, outOfRange: false });
    });
    expect(result.current.docs.map((x) => x.id)).toEqual(['2']);
  });

  it('bấm tiêu đề cột: sắp theo cột đó, bấm lại thì đảo chiều, luôn về trang 1', async () => {
    const { result } = renderHook(() => useOfficialDocs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setPage(3));
    await waitFor(() => expect(api.search).toHaveBeenLastCalledWith(expect.anything(), 3, expect.anything()));

    act(() => result.current.toggleSort('docNumber'));
    await waitFor(() => expect(api.search).toHaveBeenLastCalledWith(expect.anything(), 1, { key: 'docNumber', dir: 'asc' }));
    expect(result.current.sort).toEqual({ key: 'docNumber', dir: 'asc' });

    act(() => result.current.toggleSort('docNumber'));
    await waitFor(() => expect(api.search).toHaveBeenLastCalledWith(expect.anything(), 1, { key: 'docNumber', dir: 'desc' }));
  });
});
