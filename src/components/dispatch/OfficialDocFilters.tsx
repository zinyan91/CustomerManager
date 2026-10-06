import { Search, RotateCcw } from 'lucide-react';
import type { OfficialDocFilter, OfficialDocStatus } from '../../types/officialDoc';
import { STATUS_OPTIONS } from '../../lib/officialDoc/status';
import { DateInput } from '../DateInput';

interface OfficialDocFiltersProps {
  filter: OfficialDocFilter;
  onChange: (patch: Partial<OfficialDocFilter>) => void;
  onReset: () => void;
}

const control =
  'px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm';

export function OfficialDocFilters({ filter, onChange, onReset }: OfficialDocFiltersProps) {
  return (
    <div className="px-4 py-3 flex flex-wrap items-center gap-2.5 text-sm">
      <div className="flex-1 min-w-[240px] relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filter.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Tìm theo số hiệu hoặc tiêu đề (không cần gõ dấu)"
          aria-label="Tìm văn bản"
          className={`${control} w-full pl-9`}
        />
      </div>

      <select
        value={filter.status}
        onChange={(e) => onChange({ status: e.target.value as OfficialDocStatus | 'all' })}
        aria-label="Lọc tình trạng"
        className={control}
      >
        <option value="all">Mọi tình trạng</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
        Ban hành từ
        <span className="w-40">
          <DateInput
            value={filter.issuedFrom}
            onChange={(iso) => onChange({ issuedFrom: iso })}
            ariaLabel="Ban hành từ ngày"
            className={`${control} w-full`}
          />
        </span>
      </label>
      <label className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
        đến
        <span className="w-40">
          <DateInput
            value={filter.issuedTo}
            onChange={(iso) => onChange({ issuedTo: iso })}
            ariaLabel="Ban hành đến ngày"
            className={`${control} w-full`}
          />
        </span>
      </label>

      <button
        type="button"
        onClick={onReset}
        aria-label="Đặt lại bộ lọc"
        className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}
