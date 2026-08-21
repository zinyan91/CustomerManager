import React, { useState, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Search, ChevronDown, Check, User, X } from 'lucide-react';

export interface CustomerSummaryItem {
  Id: number;
  FullName: string;
  CifKh: string;
  Phone?: string;
}

export interface CustomerPickerProps {
  customers: CustomerSummaryItem[];
  selectedCustomerId: number | null;
  onSelectCustomer: (customerId: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomerPicker: React.FC<CustomerPickerProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  placeholder = '— Chọn Khách hàng —',
  className = '',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.Id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.FullName.toLowerCase().includes(q) ||
        c.CifKh.toLowerCase().includes(q) ||
        (c.Phone && c.Phone.includes(q))
    );
  }, [customers, search]);

  const handleSelect = (id: number | null) => {
    onSelectCustomer(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-expanded={open}
          aria-label="Chọn Khách hàng"
          className={`flex items-center justify-between gap-2 w-full rounded-[var(--r-control)] px-3 py-2 text-xs font-semibold border border-line/70 bg-surface/80 hover:bg-surface text-ink transition-colors shadow-2xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2 truncate">
            <User className="w-3.5 h-3.5 text-accent shrink-0" />
            <span className="truncate">
              {selectedCustomer
                ? `${selectedCustomer.FullName} (${selectedCustomer.CifKh})`
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
          className="z-50 w-72 sm:w-80 rounded-[var(--r-panel)] border border-line/80 bg-panel/95 backdrop-blur-xl p-2 shadow-2xl space-y-2 outline-none font-app data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, CIF, SĐT..."
              autoFocus
              className="w-full rounded-[var(--r-control)] pl-8 pr-7 py-1.5 text-xs font-semibold text-ink bg-surface/80 border border-line/70 focus:outline-none focus:border-accent"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Customer Items List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {selectedCustomerId !== null && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full text-left px-2.5 py-1.5 rounded-[var(--r-control)] text-xs text-neg hover:bg-neg-soft/60 transition-colors flex items-center justify-between cursor-pointer"
              >
                <span>— Bỏ chọn khách hàng —</span>
              </button>
            )}

            {filteredCustomers.length === 0 ? (
              <div className="text-center py-6 text-xs text-ink-faint">
                Không tìm thấy khách hàng nào
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = c.Id === selectedCustomerId;
                return (
                  <button
                    key={c.Id}
                    type="button"
                    onClick={() => handleSelect(c.Id)}
                    className={`w-full text-left px-2.5 py-2 rounded-[var(--r-control)] text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-accent-soft text-accent font-bold'
                        : 'text-ink hover:bg-surface/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold">{c.FullName}</div>
                      <div className="text-[10px] text-ink-faint font-mono">
                        CIF: {c.CifKh} {c.Phone ? `· ${c.Phone}` : ''}
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
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
