// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCurrentDate } from '../useCurrentDate';

afterEach(() => { cleanup(); vi.useRealTimers(); });
it('refreshes the calendar date on midnight polling and window focus', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026,9,21,23,59,50));
  const { result } = renderHook(useCurrentDate);
  expect(result.current).toBe('2026-10-21');
  act(() => vi.advanceTimersByTime(30_000));
  expect(result.current).toBe('2026-10-22');
  vi.setSystemTime(new Date(2026,9,23,8));
  act(() => window.dispatchEvent(new Event('focus')));
  expect(result.current).toBe('2026-10-23');
});
