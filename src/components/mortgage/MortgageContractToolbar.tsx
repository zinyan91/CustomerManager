import React from 'react';
import { Plus, Search } from 'lucide-react';
import type { MortgageStatusFilter } from '../../lib/mortgageContract';

const INPUT = 'rounded-xl px-3 py-2 text-xs border border-line/70 bg-surface/80 focus:border-accent';

export const MortgageContractToolbar: React.FC<{
  status: MortgageStatusFilter;
  onStatus: (s: MortgageStatusFilter) => void;
  query: string;
  onQuery: (q: string) => void;
  onNew: () => void;
}> = ({ status, onStatus, query, onQuery, onNew }) => (
  <div className="flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={onNew}
      className="flex items-center gap-1.5 bg-accent hover:opacity-90 text-accent-ink px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5" /><span>Thêm HĐTC</span>
    </button>
    <div className="relative flex-1 min-w-[200px]">
      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        aria-label="Tìm HĐTC"
        placeholder="Tìm theo số HĐTC hoặc bên thế chấp"
        value={query}
        onChange={e => onQuery(e.target.value)}
        className={`${INPUT} w-full pl-8`}
      />
    </div>
    <select
      aria-label="Lọc trạng thái"
      value={status}
      onChange={e => onStatus(e.target.value as MortgageStatusFilter)}
      className={INPUT}
    >
      <option value="active">Đang hiệu lực</option>
      <option value="released">Đã giải chấp</option>
      <option value="all">Tất cả</option>
    </select>
  </div>
);
