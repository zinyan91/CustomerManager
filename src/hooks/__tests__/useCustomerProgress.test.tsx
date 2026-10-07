// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('../../lib/api/customerProgressApi', () => ({ fetchCustomerProgressAPI: api.fetch }));

import { useCustomerProgress } from '../useCustomerProgress';

const MAP = new Map([[1, { hdtd: true, kunn: false, tsdb: true }]]);

beforeEach(() => {
  api.fetch.mockReset().mockResolvedValue(MAP);
});

describe('useCustomerProgress', () => {
  it('nạp tiến độ cho các khách hàng đang hiện', async () => {
    const { result } = renderHook(() => useCustomerProgress([1]));
    expect(result.current.progress).toBeNull();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.progress).toBe(MAP));
    expect(api.fetch).toHaveBeenCalledWith([1]);
    expect(result.current.loading).toBe(false);
  });

  it('danh sách rỗng thì không gọi và không đang nạp', () => {
    const { result } = renderHook(() => useCustomerProgress([]));
    expect(api.fetch).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('lỗi thì trả lỗi, progress vẫn null (không thành "chưa có hồ sơ")', async () => {
    api.fetch.mockRejectedValue(new Error('permission denied'));
    const { result } = renderHook(() => useCustomerProgress([1]));
    await waitFor(() => expect(result.current.error).toBe('permission denied'));
    expect(result.current.progress).toBeNull();
  });

  it('danh sách đổi thì dữ liệu cũ không còn dùng cho danh sách mới', async () => {
    const { result, rerender } = renderHook(({ ids }) => useCustomerProgress(ids), { initialProps: { ids: [1] } });
    await waitFor(() => expect(result.current.progress).toBe(MAP));
    api.fetch.mockReturnValue(new Promise(() => {}));
    rerender({ ids: [1, 2] });
    expect(result.current.progress).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('thứ tự mã khác nhưng cùng tập thì không nạp lại', async () => {
    const { result, rerender } = renderHook(({ ids }) => useCustomerProgress(ids), { initialProps: { ids: [2, 1] } });
    await waitFor(() => expect(result.current.progress).toBe(MAP));
    rerender({ ids: [1, 2] });
    expect(api.fetch).toHaveBeenCalledTimes(1);
  });
});
