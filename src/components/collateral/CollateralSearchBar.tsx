import React from 'react';
import { Search, Plus, X } from 'lucide-react';
import { UI } from '../../lib/uiClasses';

interface CollateralSearchBarProps {
  searchText: string;
  setSearchText: (val: string) => void;
  setColPage: (page: number) => void;
  onNewCollateral?: () => void;
}

export const CollateralSearchBar: React.FC<CollateralSearchBarProps> = ({
  searchText,
  setSearchText,
  setColPage,
  onNewCollateral,
}) => {
  const hasFilter = Boolean(searchText);

  const handleClear = () => {
    setSearchText('');
    setColPage(1);
  };

  return (
    <div className={`${UI.containerCardBg} rounded-2xl p-3.5 sm:p-4 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex flex-wrap items-center gap-3 animate-in fade-in duration-150`}>
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Tìm theo Mã CIF, Tên chủ tài sản, Số GCN, Địa chỉ hoặc Mã TSBĐ..."
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setColPage(1); }}
          className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
        />
      </div>

      {hasFilter && (
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-line/60 bg-surface text-ink-muted hover:text-ink text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
          title="Xóa bộ lọc"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Xóa lọc</span>
        </button>
      )}

      {onNewCollateral && (
        <button
          type="button"
          onClick={onNewCollateral}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-accent-ink font-bold text-xs shadow-md shadow-accent/25 hover:opacity-95 cursor-pointer transition-all active:scale-98 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm TSBĐ mới</span>
        </button>
      )}
    </div>
  );
};

