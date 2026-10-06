import { useCallback, useEffect, useRef, useState } from 'react';

export function clampWidth(width: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(width, min), Math.max(min, max)));
}

interface Options {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  /** Độ rộng khi bấm phóng to. */
  wideWidth: number;
  /** Tối đa theo tỉ lệ chiều rộng cửa sổ. */
  maxRatio?: number;
}

const KEY_STEP = 24;

/**
 * Độ rộng một khung dán cạnh phải, kéo thanh ở mép trái để đổi. Nhớ lại ở lần mở sau và tự co
 * khi cửa sổ thu nhỏ. Dùng pointer capture để kéo mượt kể cả khi chuột ra ngoài thanh.
 */
export function useResizableWidth({ storageKey, defaultWidth, minWidth, wideWidth, maxRatio = 0.8 }: Options) {
  const maxWidth = useCallback(() => Math.max(minWidth, Math.floor(window.innerWidth * maxRatio)), [minWidth, maxRatio]);

  const [width, setWidthState] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      if (Number.isFinite(saved) && saved > 0) return clampWidth(saved, minWidth, Math.floor(window.innerWidth * maxRatio));
    } catch {
      // localStorage bị chặn: dùng độ rộng gốc
    }
    return defaultWidth;
  });
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);
  const widthRef = useRef(width);
  widthRef.current = width;

  const persist = useCallback(
    (value: number) => {
      try {
        localStorage.setItem(storageKey, String(value));
      } catch {
        // Không lưu được thì lần sau về độ rộng gốc, không ảnh hưởng thao tác hiện tại
      }
    },
    [storageKey]
  );

  useEffect(() => {
    const onResize = () => setWidthState((w) => clampWidth(w, minWidth, maxWidth()));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [minWidth, maxWidth]);

  const change = useCallback(
    (next: number) => {
      const clamped = clampWidth(next, minWidth, maxWidth());
      setWidthState(clamped);
      persist(clamped);
    },
    [minWidth, maxWidth, persist]
  );

  const endDrag = () => {
    if (!drag.current) return;
    drag.current = null;
    setIsDragging(false);
    persist(widthRef.current);
  };

  const handleProps = {
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
    'aria-label': 'Kéo để đổi độ rộng khung chat',
    'aria-valuenow': width,
    'aria-valuemin': minWidth,
    tabIndex: 0,
    onPointerDown: (e: React.PointerEvent) => {
      drag.current = { startX: e.clientX, startWidth: widthRef.current };
      setIsDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag.current) return;
      // Khung dán cạnh phải: kéo sang trái thì rộng ra
      setWidthState(clampWidth(drag.current.startWidth + (drag.current.startX - e.clientX), minWidth, maxWidth()));
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onDoubleClick: () => change(defaultWidth),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') change(widthRef.current + KEY_STEP);
      else if (e.key === 'ArrowRight') change(widthRef.current - KEY_STEP);
      else if (e.key === 'Home') change(defaultWidth);
      else return;
      e.preventDefault();
    },
  };

  return {
    width,
    isDragging,
    isWide: width >= wideWidth,
    toggleWide: () => change(widthRef.current >= wideWidth ? defaultWidth : wideWidth),
    handleProps,
  };
}
