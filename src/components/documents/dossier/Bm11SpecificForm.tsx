import React, { useEffect, useState } from 'react';
import type { DossierCommon } from '../registry/types';
import type { Bm11Specific } from '../registry/templates/bm11TraNoTruocHan';
import { CustomerPicker } from '../../ui/CustomerPicker';
import { DateInput } from '../../DateInput';
import { fetchCustomersAPI } from '../../../lib/api';
import { formatMoneyInput } from '../../../lib/utils';
import type { Customer } from '../../../types';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

const Group: React.FC<{ title: string; accent?: string; children: React.ReactNode }> = ({
  title, accent = 'border-accent/40 text-accent', children,
}) => (
  <div className={`pl-3.5 border-l-2 ${accent.split(' ')[0]} space-y-2.5`}>
    <div className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${accent.split(' ')[1] ?? 'text-accent'}`}>
      {title}
    </div>
    {children}
  </div>
);

export const Bm11SpecificForm: React.FC<{
  common: DossierCommon;
  specific: Bm11Specific;
  patch: (p: Partial<Bm11Specific>) => void;
}> = ({ common, specific, patch }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomersAPI().then(setCustomers).catch(() => {});
  }, []);

  // Tự động đồng bộ từ common nếu có
  useEffect(() => {
    const updates: Partial<Bm11Specific> = {};
    if (!specific?.customerName && common?.partyA?.name) updates.customerName = common.partyA.name;
    if (!specific?.cccd && common?.partyA?.cccd) updates.cccd = common.partyA.cccd;
    if (!specific?.cif && common?.partyA?.cif) updates.cif = common.partyA.cif;
    if (!specific?.address && common?.partyA?.address) updates.address = common.partyA.address;
    if (!specific?.accNo1 && common?.bank?.accNo) updates.accNo1 = common.bank.accNo;
    if (Object.keys(updates).length > 0) patch(updates);
  }, [common, specific, patch]);

  const handleSelectCustomer = (id: number | null) => {
    setSelectedCustomerId(id);
    if (id !== null) {
      const c = customers.find(item => item.Id === id);
      if (c) {
        patch({
          customerName: c.FullName,
          cccd: c.NationalId || '',
          address: c.Address || '',
          phone: c.Phone || '',
          cif: c.CifKh || '',
          accNo1: c.AccountNumber || specific?.accNo1 || '',
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Thông tin Khách hàng */}
      <Group title="1. Thông tin Khách hàng" accent="border-accent/50 text-accent">
        <div className="space-y-2.5">
          <div>
            <label className={LABEL}>Chọn nhanh từ Danh sách Khách hàng</label>
            <CustomerPicker
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={handleSelectCustomer}
              placeholder="— Tìm theo tên, CIF, SĐT để điền hồ sơ —"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>Họ tên Khách hàng</label>
              <input
                className={INPUT}
                placeholder="VD: NGUYỄN VĂN A"
                value={specific?.customerName || common?.partyA?.name || ''}
                onChange={e => patch({ customerName: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Mã CIF</label>
              <input
                className={`${INPUT} font-mono`}
                placeholder="VD: 000001"
                value={specific?.cif || common?.partyA?.cif || ''}
                onChange={e => patch({ cif: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className={LABEL}>CCCD / CMND / ĐKKD</label>
              <input
                className={`${INPUT} font-mono`}
                placeholder="VD: 079123456789"
                value={specific?.cccd || common?.partyA?.cccd || ''}
                onChange={e => patch({ cccd: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Ngày cấp</label>
              <input
                className={INPUT}
                placeholder="VD: 15/06/2021"
                value={specific?.cccdDate || common?.partyA?.cccdDate || ''}
                onChange={e => patch({ cccdDate: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Nơi cấp</label>
              <input
                className={INPUT}
                placeholder="VD: Cục CS QLHC về TTXH"
                value={specific?.cccdPlace || common?.partyA?.cccdPlace || ''}
                onChange={e => patch({ cccdPlace: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className={LABEL}>Địa chỉ liên hệ</label>
              <input
                className={INPUT}
                placeholder="VD: 123 Nguyễn Thị Minh Khai, Q.3, TP.HCM"
                value={specific?.address || common?.partyA?.address || ''}
                onChange={e => patch({ address: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL}>Số điện thoại</label>
              <input
                className={`${INPUT} font-mono`}
                placeholder="VD: 0901234567"
                value={specific?.phone || ''}
                onChange={e => patch({ phone: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Group>

      {/* 2. Đơn vị tiếp nhận & Ngày lập */}
      <Group title="2. Cơ quan tiếp nhận & Ngày đề nghị" accent="border-pos/50 text-pos">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className={LABEL}>CN/PGD Vietbank tiếp nhận</label>
            <input
              className={INPUT}
              placeholder="VD: Sài Gòn / An Phú"
              value={specific?.branchName || ''}
              onChange={e => patch({ branchName: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Địa danh lập</label>
            <input
              className={INPUT}
              placeholder="VD: TP. Hồ Chí Minh"
              value={specific?.docPlace || ''}
              onChange={e => patch({ docPlace: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Ngày lập đề nghị</label>
            <DateInput
              className={INPUT}
              value={specific?.docDate || common?.contractDate || ''}
              onChange={v => patch({ docDate: v })}
            />
          </div>
        </div>
      </Group>

      {/* 3. Tài khoản trích thu nợ / Tất toán */}
      <Group title="3. Tài khoản trích thu nợ" accent="border-warn/50 text-warn">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={LABEL}>Số tài khoản trích nợ</label>
            <input
              className={`${INPUT} font-mono`}
              placeholder="VD: 000000666888"
              value={specific?.accNo1 || common?.bank?.accNo || ''}
              onChange={e => patch({ accNo1: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Loại tài khoản</label>
            <input
              className={INPUT}
              placeholder="VD: Tài khoản thanh toán / Tiền gửi"
              value={specific?.accType1 || ''}
              onChange={e => patch({ accType1: e.target.value })}
            />
          </div>
        </div>
      </Group>

      {/* 4. Khoản vay trả trước hạn */}
      <Group title="4. Khoản vay đề nghị trả nợ trước hạn" accent="border-accent/50 text-accent">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className={LABEL}>Hợp đồng tín dụng số</label>
            <input
              className={`${INPUT} font-mono`}
              placeholder="VD: 123/2026/HĐTD-VB"
              value={specific?.contractNo || ''}
              onChange={e => patch({ contractNo: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Giấy nhận nợ số</label>
            <input
              className={`${INPUT} font-mono`}
              placeholder="VD: GNN01/123"
              value={specific?.gnnNo || ''}
              onChange={e => patch({ gnnNo: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Số tài khoản vay</label>
            <input
              className={`${INPUT} font-mono`}
              placeholder="VD: 888800112233"
              value={specific?.loanAccNo || ''}
              onChange={e => patch({ loanAccNo: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={LABEL}>Số tiền gốc đề nghị trả (VNĐ)</label>
            <input
              className={`${INPUT} font-mono font-bold text-accent`}
              placeholder="VD: 100,000,000"
              value={specific?.principalAmount || ''}
              onChange={e => patch({ principalAmount: formatMoneyInput(e.target.value) })}
            />
          </div>
          <div>
            <label className={LABEL}>Số tiền lãi (nếu có)</label>
            <input
              className={`${INPUT} font-mono`}
              placeholder="VD: 2,500,000"
              value={specific?.interestAmount || ''}
              onChange={e => patch({ interestAmount: formatMoneyInput(e.target.value) })}
            />
          </div>
        </div>
      </Group>
    </div>
  );
};
