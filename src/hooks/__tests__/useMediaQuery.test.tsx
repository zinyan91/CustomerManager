// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MOBILE_QUERY, useIsMobile, useMediaQuery } from '../useMediaQuery';

function stubMatchMedia(initial: boolean) {
  let current = initial;
  const listeners = new Set<() => void>();
  const list = {
    get matches() {
      return current;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => list));
  window.matchMedia = globalThis.matchMedia;
  return {
    set(next: boolean) {
      current = next;
      listeners.forEach((fn) => fn());
    },
    listeners,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error: gỡ stub để các test khác chạy như môi trường không có matchMedia
  delete window.matchMedia;
});

describe('useMediaQuery', () => {
  it('không có matchMedia thì không khớp, không lỗi', () => {
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });

  it('khớp ngay lần đầu và đổi theo khi cửa sổ đổi cỡ', () => {
    const mq = stubMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(result.current).toBe(true);
    act(() => mq.set(false));
    expect(result.current).toBe(false);
  });

  it('gỡ lắng nghe khi hủy', () => {
    const mq = stubMatchMedia(false);
    const { unmount } = renderHook(() => useIsMobile());
    expect(mq.listeners.size).toBe(1);
    unmount();
    expect(mq.listeners.size).toBe(0);
  });
});
