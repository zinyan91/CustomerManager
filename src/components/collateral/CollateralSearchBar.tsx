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
    <div className={`${styles.containerCardBg} rounded-lg p-4 border flex flex-wrap items-center gap-3`}>
      <div className="flex items-center space-x-2 text-accent font-bold uppercase tracking-wider text-xs pr-3 border-r border-line">
        <Search className="w-4 h-4" />
        <span>LỌC TSBĐ</span>
      </div>
      <div className="flex-1 min-w-[140px]">
        <input
          type="text"
          placeholder="Mã CIF..."
          value={searchCif}
          onChange={e => { setSearchCif(e.target.value); setColPage(1); }}
          className={`w-full rounded-md px-3 py-1.5 text-xs ${styles.inputStyle}`}
        />
      </div>
      <div className="flex-1 min-w-[140px]">
        <input
          type="text"
          placeholder="Tên chủ tài sản..."
          value={searchOwnerName}
          onChange={e => { setSearchOwnerName(e.target.value); setColPage(1); }}
          className={`w-full rounded-md px-3 py-1.5 text-xs ${styles.inputStyle}`}
        />
      </div>
      <div className="flex-1 min-w-[140px]">
        <input
          type="text"
          placeholder="Số GCN / Địa chỉ / Mã TSBĐ..."
          value={searchAssetCode}
          onChange={e => { setSearchAssetCode(e.target.value); setColPage(1); }}
          className={`w-full rounded-md px-3 py-1.5 text-xs ${styles.inputStyle}`}
        />
      </div>
    </div>
  );
};
