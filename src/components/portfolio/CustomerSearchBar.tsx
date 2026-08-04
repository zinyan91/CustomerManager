import React from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import type { Customer } from '../../types';

interface CustomerSearchBarProps {
  isLight: boolean;
  inputStyle: string;
  labelStyle: string;
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
  containerCardBg: string;
}

export const CustomerSearchBar: React.FC<CustomerSearchBarProps> = ({
  isLight,
  inputStyle,
  labelStyle,
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
  containerCardBg,
}) => {
  return (
    <div className={`${containerCardBg} rounded-2xl p-5 border`}>
      <div className="text-xs font-bold text-sky-500 uppercase tracking-wider mb-3 flex items-center space-x-2">
        <Search className="w-4 h-4" />
        <span>TRA CỨU THÔNG TIN KHOẢN VAY KHÁCH HÀNG</span>
      </div>

      <div className="mb-3 relative">
        <label className={`block mb-1 text-[11px] uppercase tracking-wide flex items-center justify-between ${isLight ? 'text-slate-700 font-bold' : 'text-slate-300'}`}>
          <span>⚡ CHỌN KHÁCH HÀNG TỪ DANH SÁCH</span>
          <span className="text-[10px] text-sky-500 font-normal">({allCustomers.length} Khách hàng sẵn có)</span>
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
            className={`w-full rounded-xl pl-3 pr-10 py-2.5 text-xs transition-colors cursor-pointer ${inputStyle}`}
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {showDropdown && dropdownFiltered.length > 0 && (
          <div className={`absolute z-40 w-full mt-1 border rounded-xl shadow-2xl max-h-60 overflow-y-auto ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-slate-100'
          }`}>
            {dropdownFiltered.map(c => (
              <button
                key={c.Id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handlePickCustomer(c); }}
                className={`w-full text-left px-4 py-2.5 transition-colors flex items-center justify-between group border-b last:border-0 ${
                  isLight
                    ? 'hover:bg-sky-50 border-slate-100'
                    : 'hover:bg-sky-600/20 border-slate-800/50'
                }`}
              >
                <span className="font-semibold text-sky-600 dark:text-sky-400 group-hover:underline">{c.FullName}</span>
                <span className="font-mono text-sky-600 dark:text-sky-400 font-bold text-[11px] shrink-0 ml-3">{c.CifKh}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2 mb-3">
        <div className={`flex-1 h-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
        <span className={`text-[10px] uppercase tracking-wider px-2 ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>hoặc tìm kiếm nâng cao</span>
        <div className={`flex-1 h-px ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}></div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className={`block mb-1 text-[11px] ${labelStyle}`}>Mã CIF Khách hàng</label>
          <input type="text" value={searchCif} onChange={e => setSearchCif(e.target.value)}
            placeholder="005236683..."
            className={`w-full rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={`block mb-1 text-[11px] ${labelStyle}`}>Họ tên Khách hàng</label>
          <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)}
            placeholder="Lê Ngọc Quế Hân..."
            className={`w-full rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`} />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={`block mb-1 text-[11px] ${labelStyle}`}>Số Hợp Đồng Tín Dụng</label>
          <input type="text" value={searchContract} onChange={e => setSearchContract(e.target.value)}
            placeholder="HDTL-005236683..."
            className={`w-full rounded-xl px-3 py-2 text-xs transition-colors ${inputStyle}`} />
        </div>
        <button type="submit" disabled={isSearching}
          className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold px-5 py-2 rounded-xl transition-colors shrink-0 shadow-sm">
          <Search className="w-4 h-4" />
          <span>{isSearching ? 'Đang tìm...' : 'TÌM KIẾM'}</span>
        </button>
        {foundCustomer && (
          <button type="button" onClick={handleClearSearch}
            className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-2 rounded-xl transition-colors">
            <X className="w-4 h-4" />
            <span>Xóa</span>
          </button>
        )}
      </form>
    </div>
  );
};
