import React from 'react';
import { Search } from 'lucide-react';
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
}) => {
  return (
    <div className={`${styles.containerCardBg} rounded-2xl p-4 sm:p-4.5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card flex flex-wrap items-center gap-3 animate-in fade-in duration-150`}>
      <div className="flex items-center space-x-2 text-accent font-bold uppercase tracking-wider text-xs pr-3 border-r border-line/60">
        <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0">
          <Search className="w-4 h-4" />
        </div>
        <span className="text-[11px] tracking-wider">LỌC TSBĐ</span>
      </div>
      <div className="flex-1 min-w-[140px]">
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
      <div className="flex-1 min-w-[140px]">
        <input
          type="text"
          placeholder="Số GCN / Địa chỉ / Mã TSBĐ..."
          value={searchAssetCode}
          onChange={e => { setSearchAssetCode(e.target.value); setColPage(1); }}
          className={`w-full rounded-xl px-3 py-2 text-xs border border-line/70 bg-surface/80 focus:border-accent ${styles.inputStyle}`}
        />
      </div>
    </div>
  );
};
