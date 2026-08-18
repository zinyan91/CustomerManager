import React from 'react';
import { UI } from '../../lib/uiClasses';
import { Search, Target, Wallet, Check, X } from 'lucide-react';

interface MdsdvFilterHeaderProps {
  query: string;
  setQuery: (val: string) => void;
  level1Code: string;
  setLevel1Code: (val: string) => void;
  overdraftOnly: boolean;
  setOverdraftOnly: React.Dispatch<React.SetStateAction<boolean>>;
  level1Options: Array<{ code: string; name: string }>;
}

export const MdsdvFilterHeader: React.FC<MdsdvFilterHeaderProps> = ({
  query,
  setQuery,
  level1Code,
  setLevel1Code,
  overdraftOnly,
  setOverdraftOnly,
  level1Options,
}) => {
  const cardBg = UI.containerCardBg;
  const inputCls = UI.inputStyle;

  return (
    <div className={`${cardBg} rounded-xl p-4 sm:p-5 border border-line-strong shadow-xs space-y-4`}>
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-accent-soft text-accent border border-accent/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-ink uppercase flex items-center gap-2">
              TRA CỨU MỤC ĐÍCH SỬ DỤNG VỐN
            </h2>
          </div>
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Search Input */}
        <div className="md:col-span-6">
          <label className="block text-[11px] font-bold text-ink-faint mb-1">
            Tìm kiếm theo Mã hoặc Tên (không dấu)
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="VD: CEA01110, CEA0111001, trong lua, von luu dong..."
              className={`${inputCls} pl-9 pr-8 h-10 w-full font-sans text-xs`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-faint hover:text-ink hover:bg-panel transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Ngành cấp 1 dropdown */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-ink-faint mb-1">
            Ngành kinh tế cấp 1
          </label>
          <select
            value={level1Code}
            onChange={e => setLevel1Code(e.target.value)}
            className={`${inputCls} bg-panel h-10 w-full text-xs truncate`}
          >
            <option value="">Tất cả ngành (21 ngành)</option>
            {level1Options.map(o => (
              <option key={o.code} value={o.code}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Thấu chi button */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-ink-faint mb-1">
            Lọc theo tính chất
          </label>
          <button
            type="button"
            onClick={() => setOverdraftOnly(v => !v)}
            className={`w-full h-10 flex items-center justify-center space-x-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${overdraftOnly
              ? 'bg-accent text-accent-ink border-accent shadow-xs'
              : 'bg-panel text-ink-muted border-line hover:bg-panel-muted hover:text-ink'
              }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>CHỈ TK THẤU CHI</span>
            {overdraftOnly && <Check className="w-3.5 h-3.5 ml-1" />}
          </button>
        </div>
      </div>

      {/* Quick Industry Filter Tags */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none pt-1">
        <span className="text-ink-faint shrink-0 font-medium">Lọc nhanh:</span>
        <button
          type="button"
          onClick={() => setLevel1Code('')}
          className={`px-2 py-0.5 rounded-md border shrink-0 transition-colors ${!level1Code ? 'bg-accent-soft text-accent border-accent/40 font-bold' : 'bg-panel-muted text-ink-faint border-line hover:text-ink'
            }`}
        >
          Tất cả
        </button>
        {level1Options.slice(0, 7).map(o => (
          <button
            key={o.code}
            type="button"
            onClick={() => setLevel1Code(level1Code === o.code ? '' : o.code)}
            className={`px-2 py-0.5 rounded-md border shrink-0 transition-colors ${level1Code === o.code ? 'bg-accent text-accent-ink border-accent font-bold' : 'bg-panel text-ink-faint border-line hover:text-ink hover:bg-panel-muted'
              }`}
            title={o.name}
          >
            {o.code}: {o.name.length > 20 ? `${o.name.slice(0, 20)}...` : o.name}
          </button>
        ))}
      </div>
    </div>
  );
};
