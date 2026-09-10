import React, { useState, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Search, ChevronDown, Check, Landmark, X } from 'lucide-react';
import type { DisbursementPayee } from '../../lib/disbursementDb';
import { formatNationalId } from '../../lib/utils';

export interface DisbursementPayeePickerProps {
  payees: DisbursementPayee[];
  selectedPayeeId: string | null;
  onSelectPayee: (payeeId: string | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DisbursementPayeePicker: React.FC<DisbursementPayeePickerProps> = ({
  payees,
  selectedPayeeId,
  onSelectPayee,
  placeholder = '— Chọn từ Thông tin giải ngân —',
  className = '',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedPayee = useMemo(
    () => payees.find((p) => p.Id === selectedPayeeId),
    [payees, selectedPayeeId]
  );

  const filteredPayees = useMemo(() => {
    let list = payees;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = payees.filter(
        (p) =>
          (p.FullName || '').toLowerCase().includes(q) ||
          (p.NationalId || '').toLowerCase().includes(q) ||
          (p.AccountNumber || '').toLowerCase().includes(q) ||
          (p.BankName || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
  }, [payees, search]);

  const handleSelect = (id: string | null) => {
    onSelectPayee(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-expanded={open}
          aria-label="Chọn Thông tin giải ngân"
          className={`flex items-center justify-between gap-2 w-full rounded-xl px-3 py-2 text-xs font-semibold border border-line/70 bg-surface/80 hover:bg-surface text-ink transition-colors shadow-2xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2 truncate">
            <Landmark className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate">
              {selectedPayee
                ? `${selectedPayee.FullName}${selectedPayee.AccountNumber ? ` — STK: ${selectedPayee.AccountNumber}` : ''}${selectedPayee.BankName ? ` (${selectedPayee.BankName})` : ''}`
                : placeholder}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-ink-faint shrink-0 ml-1" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 w-80 sm:w-96 rounded-xl border border-line/80 bg-panel/95 backdrop-blur-xl p-2 shadow-2xl space-y-2 outline-none font-app data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, CCCD, STK, ngân hàng..."
              autoFocus
              className="w-full rounded-lg pl-8 pr-7 py-1.5 text-xs font-semibold text-ink bg-surface/80 border border-line/70 focus:outline-none focus:border-accent"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Payee Items List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {selectedPayeeId !== null && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neg hover:bg-neg-soft/60 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>— Bỏ chọn người thụ hưởng —</span>
              </button>
            )}

            {filteredPayees.length === 0 ? (
              <div className="text-center py-6 text-xs text-ink-faint">
                Không tìm thấy thông tin giải ngân nào
              </div>
            ) : (
              filteredPayees.map((p) => {
                const isSelected = p.Id === selectedPayeeId;
                return (
                  <button
                    key={p.Id}
                    type="button"
                    onClick={() => handleSelect(p.Id)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-accent-soft text-accent font-bold'
                        : 'text-ink hover:bg-surface/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold text-ink">{p.FullName}</span>
                        {p.NationalId && (
                          <span className="text-[10px] text-ink-muted font-mono shrink-0">
                            {formatNationalId(p.NationalId)}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-faint truncate mt-0.5">
                        {p.AccountNumber ? (
                          <span className="font-mono text-accent font-semibold">{p.AccountNumber}</span>
                        ) : null}
                        {p.AccountNumber && p.BankName && <span> • </span>}
                        {p.BankName && <span>{p.BankName}</span>}
                        {p.BankBranch && <span> ({p.BankBranch})</span>}
                        {!p.AccountNumber && !p.BankName && <span>—</span>}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-accent shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
