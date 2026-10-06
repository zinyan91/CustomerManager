// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { clampWidth, useResizableWidth } from '../useResizableWidth';

const KEY = 'test_width';
const opts = { storageKey: KEY, defaultWidth: 480, minWidth: 380, wideWidth: 800 };

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'innerWidth', { value: 1600, configurable: true });
});

const ptr = (clientX: number) => ({ clientX, pointerId: 1, currentTarget: { setPointerCapture: () => {} } }) as never;
const key = (k: string) => ({ key: k, preventDefault: () => {} }) as never;

describe('clampWidth', () => {
  it('giữ trong khoảng min..max; max nhỏ hơn min thì lấy min', () => {
    expect(clampWidth(100, 380, 1000)).toBe(380);
    expect(clampWidth(5000, 380, 1000)).toBe(1000);
    expect(clampWidth(600.4, 380, 1000)).toBe(600);
    expect(clampWidth(500, 380, 200)).toBe(380);
  });
});

describe('useResizableWidth', () => {
  it('mặc định là độ rộng gốc; đọc lại độ rộng đã lưu và chặn giá trị bậy', () => {
    expect(renderHook(() => useResizableWidth(opts)).result.current.width).toBe(480);
    localStorage.setItem(KEY, '700');
    expect(renderHook(() => useResizableWidth(opts)).result.current.width).toBe(700);
    localStorage.setItem(KEY, 'rác');
    expect(renderHook(() => useResizableWidth(opts)).result.current.width).toBe(480);
    localStorage.setItem(KEY, '99999');
    expect(renderHook(() => useResizableWidth(opts)).result.current.width).toBe(1280);
  });

  it('kéo sang trái thì rộng ra, sang phải thì hẹp lại, và lưu lại', () => {
    const { result } = renderHook(() => useResizableWidth(opts));
    act(() => result.current.handleProps.onPointerDown(ptr(1000)));
    expect(result.current.isDragging).toBe(true);
    act(() => result.current.handleProps.onPointerMove(ptr(800)));
    expect(result.current.width).toBe(680);
    act(() => result.current.handleProps.onPointerMove(ptr(1100)));
    expect(result.current.width).toBe(380);
    act(() => result.current.handleProps.onPointerUp());
    expect(result.current.isDragging).toBe(false);
    expect(localStorage.getItem(KEY)).toBe('380');
  });

  it('kéo quá giới hạn thì dừng ở tối đa (80% chiều rộng cửa sổ)', () => {
    const { result } = renderHook(() => useResizableWidth(opts));
    act(() => result.current.handleProps.onPointerDown(ptr(1500)));
    act(() => result.current.handleProps.onPointerMove(ptr(0)));
    expect(result.current.width).toBe(1280);
  });

  it('di chuột khi chưa nhấn thì không đổi độ rộng', () => {
    const { result } = renderHook(() => useResizableWidth(opts));
    act(() => result.current.handleProps.onPointerMove(ptr(200)));
    expect(result.current.width).toBe(480);
  });

  it('nhấp đúp trả về độ rộng gốc', () => {
    localStorage.setItem(KEY, '900');
    const { result } = renderHook(() => useResizableWidth(opts));
    act(() => result.current.handleProps.onDoubleClick());
    expect(result.current.width).toBe(480);
  });

  it('bàn phím: mũi tên trái mở rộng, phải thu hẹp, Home về gốc', () => {
    const { result } = renderHook(() => useResizableWidth(opts));
    act(() => result.current.handleProps.onKeyDown(key('ArrowLeft')));
    expect(result.current.width).toBe(504);
    act(() => result.current.handleProps.onKeyDown(key('ArrowRight')));
    act(() => result.current.handleProps.onKeyDown(key('ArrowRight')));
    expect(result.current.width).toBe(456);
    act(() => result.current.handleProps.onKeyDown(key('Home')));
    expect(result.current.width).toBe(480);
  });

  it('nút phóng to đổi qua lại giữa rộng và gốc', () => {
    const { result } = renderHook(() => useResizableWidth(opts));
    expect(result.current.isWide).toBe(false);
    act(() => result.current.toggleWide());
    expect(result.current.width).toBe(800);
    expect(result.current.isWide).toBe(true);
    act(() => result.current.toggleWide());
    expect(result.current.width).toBe(480);
  });

  it('thu nhỏ cửa sổ thì độ rộng tự co lại cho vừa', () => {
    const { result } = renderHook(() => useResizableWidth(opts));
    act(() => result.current.toggleWide());
    Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.width).toBe(720);
  });

  it('thanh kéo có thuộc tính truy cập đúng', () => {
    const { result } = renderHook(() => useResizableWidth(opts));
    expect(result.current.handleProps).toMatchObject({ role: 'separator', 'aria-orientation': 'vertical', 'aria-valuenow': 480, 'aria-valuemin': 380, tabIndex: 0 });
  });
});
