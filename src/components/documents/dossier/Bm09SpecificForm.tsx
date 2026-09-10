import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { DossierCommon } from '../registry/types';
import type { Bm09Specific, Bm09Section, Bm09Item, Bm09DocType } from '../registry/templates/bm09DanhMucHoSo';
import { CustomerPicker } from '../../ui/CustomerPicker';
import { DateInput } from '../../DateInput';
import { fetchCustomersAPI } from '../../../lib/api';
import type { Customer } from '../../../types';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

const DOC_TYPE_OPTIONS: Array<{ value: Bm09DocType; label: string }> = [
  { value: 'original', label: 'Bản chính/Gốc' },
  { value: 'compare', label: 'Bản đối chiếu' },
  { value: 'certified_copy', label: 'Sao y chứng thực' },
  { value: 'other', label: 'Khác' },
];

export const Bm09SpecificForm: React.FC<{
  common: DossierCommon;
  specific: Bm09Specific;
  patch: (p: Partial<Bm09Specific>) => void;
}> = ({ common, specific, patch }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [expandedParts, setExpandedParts] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: false,
    6: false,
    7: false,
  });

  useEffect(() => {
    fetchCustomersAPI().then(setCustomers).catch(() => {});
  }, []);

  // Tự động đồng bộ từ common nếu specific còn trống
  useEffect(() => {
    const updates: Partial<Bm09Specific> = {};
    if (!specific?.customerName && common?.partyA?.name) updates.customerName = common.partyA.name;
    if (!specific?.cif && common?.partyA?.cif) updates.cif = common.partyA.cif;
    if (Object.keys(updates).length > 0) patch(updates);
  }, [common, specific, patch]);

  const handleSelectCustomer = (id: number | null) => {
    setSelectedCustomerId(id);
    if (id !== null) {
      const c = customers.find(item => item.Id === id);
      if (c) {
        patch({
          customerName: c.FullName,
          cif: c.CifKh || '',
        });
      }
    }
  };

  const togglePart = (partIndex: number) => {
    setExpandedParts(prev => ({ ...prev, [partIndex]: !prev[partIndex] }));
  };

  const sections = specific?.sections || [];

  const handleUpdateSections = (newSections: Bm09Section[]) => {
    patch({ sections: newSections });
  };

  const handleAddItem = (partIndex: number) => {
    const next = sections.map(sec => {
      if (sec.partIndex !== partIndex) return sec;
      const newItem: Bm09Item = {
        id: `p${partIndex}-${Date.now()}`,
        stt: String(sec.items.length + 1),
        docName: '',
        docDate: '',
        docType: 'original',
        quantity: '01',
        note: '',
      };
      return {
        ...sec,
        items: [...sec.items, newItem],
      };
    });
    handleUpdateSections(next);
  };

  const handleUpdateItem = (partIndex: number, itemId: string, updates: Partial<Bm09Item>) => {
    const next = sections.map(sec => {
      if (sec.partIndex !== partIndex) return sec;
      return {
        ...sec,
        items: sec.items.map(it => (it.id === itemId ? { ...it, ...updates } : it)),
      };
    });
    handleUpdateSections(next);
  };

  const handleRemoveItem = (partIndex: number, itemId: string) => {
    const next = sections.map(sec => {
      if (sec.partIndex !== partIndex) return sec;
      const filtered = sec.items.filter(it => it.id !== itemId);
      return {
        ...sec,
        items: filtered.map((it, i) => ({ ...it, stt: String(i + 1) })),
      };
    });
    handleUpdateSections(next);
  };

  return (
    <div className="space-y-4">
      {/* 1. Thông tin Khách hàng */}
      <div className="pl-3.5 border-l-2 border-accent/50 space-y-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-accent mb-2">
          1. Thông tin Khách hàng & Ngày lập
        </div>

        <div className="space-y-2.5">
          <div>
            <label className={LABEL}>Chọn nhanh từ Danh sách Khách hàng</label>
            <CustomerPicker
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={handleSelectCustomer}
              placeholder="— Tìm theo tên, CIF để điền thông tin —"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>Tên khách hàng</label>
              <input
                className={`${INPUT} uppercase font-semibold`}
                placeholder="VD: NGUYỄN VĂN A"
                value={specific?.customerName || ''}
                onChange={e => patch({ customerName: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Mã CIF</label>
              <input
                className={`${INPUT} font-mono`}
                placeholder="VD: 005123456"
                value={specific?.cif || ''}
                onChange={e => patch({ cif: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Ngày lập danh mục</label>
            <DateInput
              value={specific?.docDate || ''}
              onChange={v => patch({ docDate: v })}
              className={INPUT}
            />
          </div>
        </div>
      </div>

      {/* 2. Danh mục 7 Phần Hồ Sơ Tín Dụng */}
      <div className="pl-3.5 border-l-2 border-pos/50 space-y-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-pos">
            2. Các Phần Hồ Sơ Tín Dụng
          </div>
          <span className="text-[10px] text-ink-faint">7 Phần theo quy chuẩn</span>
        </div>

        <div className="space-y-3">
          {sections.map(sec => {
            const isExpanded = !!expandedParts[sec.partIndex];
            const count = sec.items.length;

            return (
              <div
                key={sec.partIndex}
                className="rounded-xl border border-line/70 bg-surface/60 overflow-hidden transition-all"
              >
                <div
                  onClick={() => togglePart(sec.partIndex)}
                  className="p-3 bg-surface/80 flex items-center justify-between cursor-pointer hover:bg-surface-elevated select-none"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-ink-muted" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-ink-muted" />
                    )}
                    <span className="font-bold text-xs text-ink">
                      PHẦN {sec.partIndex}: {sec.partTitle}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-panel border border-line text-[10px] font-mono text-ink-faint">
                      {count} chứng từ
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleAddItem(sec.partIndex);
                      if (!isExpanded) togglePart(sec.partIndex);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>

                {isExpanded && (
                  <div className="p-3 space-y-2.5 border-t border-line/60 bg-surface/30">
                    {sec.items.length === 0 ? (
                      <div className="text-center py-3 text-xs text-ink-faint italic">
                        Chưa có chứng từ nào trong phần này.{' '}
                        <button
                          type="button"
                          onClick={() => handleAddItem(sec.partIndex)}
                          className="text-accent underline font-semibold cursor-pointer"
                        >
                          Bấm vào đây để thêm
                        </button>
                      </div>
                    ) : (
                      sec.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-2.5 rounded-lg border border-line/60 bg-surface/70 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="px-1.5 py-0.5 rounded bg-surface border border-line text-[10px] font-mono font-bold text-ink-muted">
                                #{idx + 1}
                              </span>
                              <input
                                className={`${INPUT} py-1 text-xs`}
                                placeholder="Tên chứng từ..."
                                value={item.docName}
                                onChange={e => handleUpdateItem(sec.partIndex, item.id, { docName: e.target.value })}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(sec.partIndex, item.id)}
                              className="text-ink-faint hover:text-neg p-1 transition-colors cursor-pointer"
                              title="Xóa chứng từ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs">
                            <div>
                              <label className={LABEL}>Ngày chứng từ</label>
                              <input
                                className={`${INPUT} py-1 text-xs`}
                                placeholder="VD: 15/05/2026"
                                value={item.docDate}
                                onChange={e => handleUpdateItem(sec.partIndex, item.id, { docDate: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className={LABEL}>Loại chứng từ</label>
                              <select
                                className={`${INPUT} py-1 text-xs`}
                                value={item.docType}
                                onChange={e => handleUpdateItem(sec.partIndex, item.id, { docType: e.target.value as Bm09DocType })}
                              >
                                {DOC_TYPE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className={LABEL}>Số lượng bản</label>
                              <input
                                className={`${INPUT} py-1 text-center font-mono`}
                                placeholder="01"
                                value={item.quantity}
                                onChange={e => handleUpdateItem(sec.partIndex, item.id, { quantity: e.target.value })}
                              />
                            </div>

                            <div>
                              <label className={LABEL}>Ghi chú</label>
                              <input
                                className={`${INPUT} py-1 text-xs`}
                                placeholder="Ghi chú (nếu có)"
                                value={item.note}
                                onChange={e => handleUpdateItem(sec.partIndex, item.id, { note: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
