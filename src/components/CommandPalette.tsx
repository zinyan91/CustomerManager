import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { useLang } from '../context/LanguageContext';
import { NAV_ITEMS } from '../lib/navigation';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette = memo<CommandPaletteProps>(({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems = useMemo(() => NAV_ITEMS, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase().trim();
    return allItems.filter((item) => {
      const label = t(item.labelKey).toLowerCase();
      const group = t(item.groupKey).toLowerCase();
      return label.includes(q) || group.includes(q) || item.keywords.some((kw) => kw.includes(q));
    });
  }, [query, allItems, t]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback((path: string) => {
    navigate(path, { replace: path === location.pathname });
    onClose();
  }, [navigate, location.pathname, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex].path);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 transition-opacity duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-panel border border-line-strong rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-3.5 py-3 border-b border-line gap-3 bg-panel-muted/50">
          <Search className="w-4 h-4 text-accent shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm phân hệ, hợp đồng, khoản vay..."
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint font-app"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-panel-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-faint">
              Không tìm thấy phân hệ tương ứng với "{query}"
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.path)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors duration-150 text-left ${
                    isSelected
                      ? 'bg-accent-soft text-accent font-medium'
                      : 'text-ink-muted hover:bg-panel-muted hover:text-ink'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-md border ${
                        isSelected
                          ? 'border-accent/30 bg-accent/10 text-accent'
                          : 'border-line bg-panel text-ink-faint'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-ink truncate">{t(item.labelKey)}</div>
                      <div className="text-[10px] text-ink-faint">{t(item.groupKey)}</div>
                    </div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-accent' : 'text-ink-faint opacity-50'}`} />
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-line px-3.5 py-2 bg-panel-muted/40 flex items-center justify-between text-[11px] text-ink-faint">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-panel border border-line text-[10px] font-mono">↑↓</span>
            <span>Điều hướng</span>
            <span className="px-1.5 py-0.5 rounded bg-panel border border-line text-[10px] font-mono ml-2">↵</span>
            <span>Chọn</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-panel border border-line text-[10px] font-mono">ESC</span>
            <span>Đóng</span>
          </div>
        </div>
      </div>
    </div>
  );
});

CommandPalette.displayName = 'CommandPalette';
