import React from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import type { Customer } from '../../types';
import { UI } from '../../lib/uiClasses';

interface CustomerSearchBarProps {
  allCustomers: Customer[];
  dropdownQuery: string;
  setDropdownQuery: (q: string) => void;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  dropdownFiltered: Customer[];
  handlePickCustomer: (c: Customer) => void;
  searchCif: string;
  setSearchCif: (s: string) => void;
  searchName: string;
  setSearchName: (s: string) => void;
  searchContract: string;
  setSearchContract: (s: string) => void;
  isSearching: boolean;
  handleSearch: (e: React.FormEvent) => void;
  foundCustomer: Customer | null;
  handleClearSearch: () => void;
}

export const CustomerSearchBar: React.FC<CustomerSearchBarProps> = ({
  allCustomers,
  dropdownQuery,
  setDropdownQuery,
  showDropdown,
  setShowDropdown,
  dropdownFiltered,
  handlePickCustomer,
  searchCif,
  setSearchCif,
  searchName,
  setSearchName,
  searchContract,
  setSearchContract,
  isSearching,
  handleSearch,
  foundCustomer,
  handleClearSearch,
}) => {
  return (
    <div className="relative z-30 rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3.5">
      <div className="text-xs font-bold text-accent tracking-tight flex items-center space-x-2">
        <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0">
          <Search className="w-4 h-4" />
        </div>
        <span className="uppercase tracking-wider text-[11px]">TRA CỨU THÔNG TIN KHOẢN VAY KHÁCH HÀNG</span>
      </div>

      <div className="relative">
        <label className="block mb-1 text-[10px] uppercase tracking-wider text-ink-muted font-bold">
          CHỌN KHÁCH HÀNG TỪ DANH SÁCH
        </label>
        <div className="relative">
          <input
            type="text"
            value={dropdownQuery}
            onChange={e => { setDropdownQuery(e.target.value); setShowDropdown(true); }}
            onClick={() => { setDropdownQuery(''); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 350)}
            placeholder={`Nhấp vào đây hoặc gõ tên / Mã CIF để chọn Khách hàng... (${allCustomers.length} KH)`}
            className={`w-full rounded-xl pl-3.5 pr-10 py-2.5 text-xs transition-colors cursor-pointer border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`}
          />
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint pointer-events-none" />
        </div>
        {showDropdown && dropdownFiltered.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 border border-line/80 rounded-2xl shadow-2xl max-h-72 overflow-y-auto bg-panel/95 backdrop-blur-2xl text-ink divide-y divide-line/40 ring-1 ring-black/10">
            {dropdownFiltered.map(c => (
              <button
                key={c.Id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handlePickCustomer(c); }}
                className="w-full text-left px-4 py-3 transition-colors flex items-center justify-between group hover:bg-accent/[0.08] cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold text-xs shrink-0">
                    {c.FullName ? c.FullName.charAt(0).toUpperCase() : 'KH'}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-ink group-hover:text-accent transition-colors block truncate text-xs">{c.FullName}</span>
                    {c.Phone && <span className="text-[10px] text-ink-muted block">{c.Phone}</span>}
                  </div>
                </div>
                <span className="font-mono text-accent font-bold text-[11px] shrink-0 ml-3 bg-accent-soft px-2.5 py-0.5 rounded-full border border-accent/20">
                  CIF: {c.CifKh}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex-1 h-px bg-line/60"></div>
        <span className="text-[10px] uppercase tracking-wider px-2 text-ink-faint font-semibold">hoặc tìm kiếm nâng cao</span>
        <div className="flex-1 h-px bg-line/60"></div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className={`block mb-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider ${UI.labelStyle}`}>Mã CIF</label>
          <input type="text" value={searchCif} onChange={e => setSearchCif(e.target.value)}
            placeholder="005236683..."
            className={`w-full rounded-xl px-3 py-2 text-xs transition-colors border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={`block mb-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider ${UI.labelStyle}`}>Họ tên Khách hàng</label>
          <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)}
            placeholder="Lê Ngọc Quế Hân..."
            className={`w-full rounded-xl px-3 py-2 text-xs transition-colors border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={`block mb-1 text-[10px] font-semibold text-ink-muted uppercase tracking-wider ${UI.labelStyle}`}>Số Hợp Đồng Tín Dụng</label>
          <input type="text" value={searchContract} onChange={e => setSearchContract(e.target.value)}
            placeholder="HDTL-005236683..."
            className={`w-full rounded-xl px-3 py-2 text-xs transition-colors border border-line/70 bg-surface/80 focus:border-accent ${UI.inputStyle}`} />
        </div>
        <button type="submit" disabled={isSearching}
          className="flex items-center space-x-2 bg-accent hover:opacity-90 disabled:opacity-60 text-accent-ink font-bold px-4.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer shadow-xs">
          <Search className="w-3.5 h-3.5" />
          <span>{isSearching ? 'Đang tìm...' : 'TÌM KIẾM'}</span>
        </button>
        {foundCustomer && (
          <button type="button" onClick={handleClearSearch}
            className="flex items-center space-x-1 text-ink-faint hover:text-ink px-3 py-2 rounded-xl transition-colors cursor-pointer border border-line/60 bg-surface/60 hover:bg-surface">
            <X className="w-3.5 h-3.5" />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </form>
    </div>
  );
};
