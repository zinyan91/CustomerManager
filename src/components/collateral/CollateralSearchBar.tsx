import React from 'react';
import { Search, Plus, X } from 'lucide-react';
import type { UiClasses } from '../../lib/uiClasses';

interface CollateralSearchBarProps {
  styles: UiClasses;
  searchCif: string;
  setSearchCif: (val: string) => void;
  searchOwnerName: string;
  setSearchOwnerName: (val: string) => void;
  searchAssetCode: string;
  setSearchAssetCode: (val: string) => void;
  setColPage: (page: number) => void;
  onNewCollateral?: () => void;
}

export const CollateralSearchBar: React.FC<CollateralSearchBarProps> = ({
  styles,
  searchCif,
  setSearchCif,
  searchOwnerName,
  setSearchOwnerName,
  searchAssetCode,
  setSearchAssetCode,
  setColPage,
  onNewCollateral,
}) => {
  const hasFilter = Boolean(searchCif || searchOwnerName || searchAssetCode);

  const handleClear = () => {
    setSearchCif('');
    setSearchOwnerName('');
    setSearchAssetCode('');
    setColPage(1);
  };

  return (
    <div className={`${styles.containerCardBg} rounded-2xl p-3.5 sm:p-4 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex flex-wrap items-center gap-3 animate-in fade-in duration-150`}>
      <div className="flex items-center space-x-2 text-accent font-bold uppercase tracking-wider text-xs pr-2 border-r border-line/60">
        <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0 shadow-2xs">
          <Search className="w-4 h-4" />
        </div>
        <span className="text-[11px] tracking-wider hidden sm:inline">LỌC TSBĐ</span>
      </div>

      <div className="flex-1 min-w-[130px]">
        <input
          type="text"
          placeholder="Mã CIF..."
          value={searchCif}
          onChange={e => { setSearchCif(e.target.value); setColPage(1); }}
          className={`w-full rounded-xl px-3 py-2 text-xs border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`}
        />
      </div>

      <div className="flex-1 min-w-[140px]">
        <input
          type="text"
          placeholder="Tên chủ tài sản..."
          value={searchOwnerName}
          onChange={e => { setSearchOwnerName(e.target.value); setColPage(1); }}
          className={`w-full rounded-xl px-3 py-2 text-xs border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`}
        />
      </div>

      <div className="flex-1 min-w-[150px]">
        <input
          type="text"
          placeholder="Số GCN / Địa chỉ / Mã TSBĐ..."
          value={searchAssetCode}
          onChange={e => { setSearchAssetCode(e.target.value); setColPage(1); }}
          className={`w-full rounded-xl px-3 py-2 text-xs border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`}
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

