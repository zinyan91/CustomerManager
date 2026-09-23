// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistedFlag } from '../usePersistedFlag';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('usePersistedFlag', () => {
  it('chưa lưu thì dùng giá trị mặc định', () => {
    expect(renderHook(() => usePersistedFlag('k', false)).result.current[0]).toBe(false);
  });

  it('ghi lại và lần mở sau đọc được', () => {
    const a = renderHook(() => usePersistedFlag('k', false));
    act(() => a.result.current[1](true));
    expect(a.result.current[0]).toBe(true);
    expect(renderHook(() => usePersistedFlag('k', false)).result.current[0]).toBe(true);
  });

  it('localStorage ném lỗi thì vẫn chạy, chỉ là không nhớ', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const h = renderHook(() => usePersistedFlag('k', true));
    expect(h.result.current[0]).toBe(true);
    act(() => h.result.current[1](false));
    expect(h.result.current[0]).toBe(false);
  });
});
