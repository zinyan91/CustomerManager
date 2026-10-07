import { useEffect, useLayoutEffect, useRef, useState, type ElementType } from 'react';

export interface MenuEntry {
  id: string;
  label: string;
  icon: ElementType;
  onSelect: () => void;
  disabled?: boolean;
}

interface ItemMenuProps {
  /** Vị trí góc trên trái của menu theo cửa sổ (chuột phải hoặc cạnh nút ⋯). */
  x: number;
  y: number;
  entries: MenuEntry[];
  onClose: () => void;
}

const MARGIN = 8;

/** Menu thao tác của một tệp hoặc thư mục. Đóng khi bấm ra ngoài, nhấn Esc, cuộn hay đổi cỡ cửa sổ; luôn nằm trong màn hình. */
export function ItemMenu({ x, y, entries, onClose }: ItemMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(MARGIN, Math.min(x, window.innerWidth - width - MARGIN)),
      top: Math.max(MARGIN, Math.min(y, window.innerHeight - height - MARGIN)),
    });
  }, [x, y, entries.length]);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      style={{ position: 'fixed', left: pos.left, top: pos.top }}
      className="z-50 min-w-48 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg"
    >
      {entries.map(({ id, label, icon: Icon, onSelect, disabled }) => (
        <button
          key={id}
          type="button"
          role="menuitem"
          disabled={disabled}
          onClick={() => {
            onClose();
            onSelect();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <Icon className="w-4 h-4 shrink-0 text-slate-500" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
