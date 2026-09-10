import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { DossierCommon } from '../registry/types';
import type { Bm07Specific, Bm07DocItem } from '../registry/templates/bm07BienBanBanGiao';
import { CustomerPicker } from '../../ui/CustomerPicker';
import { DateInput } from '../../DateInput';
import { fetchCustomersAPI } from '../../../lib/api';
import type { Customer } from '../../../types';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

const Group: React.FC<{ title: string; accent?: string; children: React.ReactNode }> = ({
  title,
  accent = 'border-accent/40 text-accent',
  children,
}) => (
  <div className={`pl-3.5 border-l-2 ${accent.split(' ')[0]} space-y-2.5`}>
    <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${accent.split(' ')[1] ?? 'text-accent'}`}>
      {title}
    </div>
    {children}
  </div>
);

export const Bm07SpecificForm: React.FC<{
  common: DossierCommon;
  specific: Bm07Specific;
  patch: (p: Partial<Bm07Specific>) => void;
}> = ({ common, specific, patch }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomersAPI().then(setCustomers).catch(() => {});
  }, []);

  // Tự động đồng bộ từ common nếu specific còn trống
  useEffect(() => {
    const updates: Partial<Bm07Specific> = {};
    if (!specific?.repName && common?.partyA?.name) updates.repName = common.partyA.name;
    if (!specific?.repCccd && common?.partyA?.cccd) updates.repCccd = common.partyA.cccd;
    if (!specific?.bankBranch && common?.bank?.branch) updates.bankBranch = common.bank.branch;
    if (Object.keys(updates).length > 0) patch(updates);
  }, [common, specific, patch]);

  const handleSelectCustomer = (id: number | null) => {
    setSelectedCustomerId(id);
    if (id !== null) {
      const c = customers.find(item => item.Id === id);
      if (c) {
        patch({
          repName: c.FullName,
          repCccd: c.NationalId || '',
          companyName: specific?.companyName || c.FullName || '',
        });
      }
    }
  };

  const items = specific?.items || [];

  const handleUpdateItem = (index: number, updates: Partial<Bm07DocItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...updates };
    patch({ items: next });
  };

  const handleAddItem = () => {
    const next = [
      ...items,
      {
        stt: String(items.length + 1),
        name: '',
        quantity: '01',
        isOriginal: true,
        isCopy: false,
        note: '',
      },
    ];
    patch({ items: next });
  };

  const handleRemoveItem = (index: number) => {
    const next = items.filter((_, i) => i !== index).map((item, i) => ({
      ...item,
      stt: String(i + 1),
    }));
    patch({ items: next });
  };

  return (
    <div className="space-y-4">
      {/* 1. Bên giao (Khách hàng) */}
      <Group title="1. Bên Giao: Đại diện Khách hàng" accent="border-accent/50 text-accent">
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
              <label className={LABEL}>Họ và tên Người giao</label>
              <input
                className={INPUT}
                placeholder="VD: NGUYỄN VĂN A"
                value={specific?.repName || ''}
                onChange={e => patch({ repName: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Chức vụ</label>
              <input
                className={INPUT}
                placeholder="VD: Giám đốc / Đại diện theo ủy quyền"
                value={specific?.repPosition || ''}
                onChange={e => patch({ repPosition: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className={LABEL}>CCCD / Hộ chiếu số</label>
              <input
                className={`${INPUT} font-mono`}
                placeholder="Số CCCD"
                value={specific?.repCccd || ''}
                onChange={e => patch({ repCccd: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Ngày cấp</label>
              <input
                className={INPUT}
                placeholder="VD: 15/05/2021"
                value={specific?.repCccdDate || ''}
                onChange={e => patch({ repCccdDate: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Nơi cấp</label>
              <input
                className={INPUT}
                placeholder="VD: Cục CS QLHC về TTXH"
                value={specific?.repCccdPlace || ''}
                onChange={e => patch({ repCccdPlace: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>Là đại diện công ty</label>
              <input
                className={INPUT}
                placeholder="Tên công ty / doanh nghiệp (nếu có)"
                value={specific?.companyName || ''}
                onChange={e => patch({ companyName: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Theo GĐN đăng ký nhân viên giao nhận ngày</label>
              <input
                className={INPUT}
                placeholder="VD: 10/05/2026"
                value={specific?.regDocDate || ''}
                onChange={e => patch({ regDocDate: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Group>

      {/* 2. Bên nhận (Vietbank) */}
      <Group title="2. Bên Nhận: Ngân hàng Vietbank" accent="border-pos/50 text-pos">
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>Vietbank Chi nhánh</label>
              <input
                className={INPUT}
                placeholder="VD: TP. Hồ Chí Minh"
                value={specific?.bankBranch || ''}
                onChange={e => patch({ bankBranch: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Phòng giao dịch (PGD)</label>
              <input
                className={INPUT}
                placeholder="VD: Đa Kao (hoặc để trống)"
                value={specific?.bankPgd || ''}
                onChange={e => patch({ bankPgd: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>Họ tên Nhân viên nhận</label>
              <input
                className={INPUT}
                placeholder="Họ tên chuyên viên/nhân viên nhận"
                value={specific?.bankStaffName || ''}
                onChange={e => patch({ bankStaffName: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Chức vụ</label>
              <input
                className={INPUT}
                placeholder="VD: CV QLKH / CV DVTT"
                value={specific?.bankStaffPosition || ''}
                onChange={e => patch({ bankStaffPosition: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>TTKD / Phòng</label>
              <input
                className={INPUT}
                placeholder="VD: Khách hàng Cá nhân / TTKD"
                value={specific?.bankDept || ''}
                onChange={e => patch({ bankDept: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Bộ phận</label>
              <input
                className={INPUT}
                placeholder="VD: Tín dụng"
                value={specific?.bankTeam || ''}
                onChange={e => patch({ bankTeam: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Group>

      {/* 3. Danh mục hồ sơ chứng từ bàn giao */}
      <Group title="3. Danh mục hồ sơ chứng từ bàn giao" accent="border-warn/50 text-warn">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-ink-faint">Danh sách hồ sơ khách hàng đã ký, đóng dấu</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 text-xs font-bold text-accent hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm chứng từ</span>
            </button>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-xl border border-line/70 bg-surface/60 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="px-1.5 py-0.5 rounded bg-surface border border-line/80 font-mono text-[10px] font-bold text-ink-muted">
                      #{idx + 1}
                    </span>
                    <input
                      className={`${INPUT} py-1 text-xs`}
                      placeholder="Tên hồ sơ chứng từ..."
                      value={item.name}
                      onChange={e => handleUpdateItem(idx, { name: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-ink-faint hover:text-neg p-1 transition-colors cursor-pointer"
                    title="Xóa dòng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs">
                  <div>
                    <label className={LABEL}>Số lượng</label>
                    <input
                      className={`${INPUT} py-1 text-center font-mono`}
                      placeholder="01"
                      value={item.quantity}
                      onChange={e => handleUpdateItem(idx, { quantity: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-4 sm:col-span-2 pt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={item.isOriginal}
                        onChange={e => handleUpdateItem(idx, { isOriginal: e.target.checked })}
                        className="rounded border-line text-accent focus:ring-accent w-3.5 h-3.5"
                      />
                      <span>Bản chính</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                      <input
                        type="checkbox"
                        checked={item.isCopy}
                        onChange={e => handleUpdateItem(idx, { isCopy: e.target.checked })}
                        className="rounded border-line text-accent focus:ring-accent w-3.5 h-3.5"
                      />
                      <span>Bản sao</span>
                    </label>
                  </div>

                  <div>
                    <label className={LABEL}>Ghi chú</label>
                    <input
                      className={`${INPUT} py-1 text-xs`}
                      placeholder="Ghi chú (nếu có)"
                      value={item.note}
                      onChange={e => handleUpdateItem(idx, { note: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Group>

      {/* 4. Ngày tháng & Địa điểm ký */}
      <Group title="4. Ngày lập & Địa điểm" accent="border-ink-faint/50 text-ink">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={LABEL}>Địa điểm</label>
            <input
              className={INPUT}
              placeholder="VD: TP. Hồ Chí Minh"
              value={specific?.docPlace || ''}
              onChange={e => patch({ docPlace: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Ngày lập biên bản</label>
            <DateInput
              value={specific?.docDate || ''}
              onChange={v => patch({ docDate: v })}
              className={INPUT}
            />
          </div>
        </div>
      </Group>
    </div>
  );
};
