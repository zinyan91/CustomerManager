import React, { useEffect, useState } from 'react';
import type { DossierCommon } from '../registry/types';
import type { Bm02Specific } from '../registry/templates/bm02ToTrinhGiaiNgan';
import { CustomerPicker } from '../../ui/CustomerPicker';
import { DateInput } from '../../DateInput';
import { fetchCustomersAPI } from '../../../lib/api';
import { formatMoneyInput } from '../../../lib/utils';
import { moneyTextToWords } from '../../../lib/numberToWords';
import { BANK_LIST } from '../../../lib/documentOptions';
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

export const Bm02SpecificForm: React.FC<{
  common: DossierCommon;
  specific: Bm02Specific;
  patch: (p: Partial<Bm02Specific>) => void;
}> = ({ common, specific, patch }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomersAPI().then(setCustomers).catch(() => {});
  }, []);

  useEffect(() => {
    const updates: Partial<Bm02Specific> = {};
    if (!specific?.customerName && common?.partyA?.name) updates.customerName = common.partyA.name;
    if (!specific?.cif && common?.partyA?.cif) updates.cif = common.partyA.cif;
    if (!specific?.regNo && common?.partyA?.cccd) updates.regNo = common.partyA.cccd;
    if (!specific?.amount && common?.totalAmount) {
      updates.amount = common.totalAmount;
      updates.amountWords = moneyTextToWords(common.totalAmount);
    }
    if (!specific?.benAccNo && common?.bank?.accNo) updates.benAccNo = common.bank.accNo;
    if (!specific?.benAccOwner && (common?.bank?.owner || common?.partyA?.name)) {
      updates.benAccOwner = common?.bank?.owner || common?.partyA?.name;
    }
    if (!specific?.benBank && common?.bank?.name) updates.benBank = common.bank.name;
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
          regNo: c.NationalId || '',
          benAccNo: c.AccountNumber || specific?.benAccNo || '',
          benAccOwner: c.FullName || specific?.benAccOwner || '',
          benBank: 'Vietbank',
        });
      }
    }
  };

  const handleAmountChange = (val: string) => {
    const formatted = formatMoneyInput(val);
    patch({
      amount: formatted,
      amountWords: moneyTextToWords(formatted),
    });
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className={LABEL}>Tên Khách hàng</label>
              <input
                className={INPUT}
                placeholder="VD: CÔNG TY TNHH ABC"
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
            <div>
              <label className={LABEL}>CNĐKKD / CCCD</label>
              <input
                className={`${INPUT} font-mono`}
                placeholder="VD: 0312345678"
                value={specific?.regNo || common?.partyA?.cccd || ''}
                onChange={e => patch({ regNo: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Group>

      {/* 2. Đơn vị kinh doanh & Ngày trình */}
      <Group title="2. Đơn vị kinh doanh & Ngày trình" accent="border-pos/50 text-pos">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={LABEL}>Tên TTKD</label>
            <input
              className={INPUT}
              placeholder="VD: Chi nhánh Sài Gòn"
              value={specific?.centerName || ''}
              onChange={e => patch({ centerName: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Mã TTKD</label>
            <input
              className={`${INPUT} font-mono`}
              placeholder="VD: 001"
              value={specific?.centerCode || ''}
              onChange={e => patch({ centerCode: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
            <label className={LABEL}>Ngày lập tờ trình</label>
            <DateInput
              className={INPUT}
              value={specific?.docDate || common?.contractDate || ''}
              onChange={v => patch({ docDate: v })}
            />
          </div>
          <div>
            <label className={LABEL}>Lần giải ngân</label>
            <input
              className={INPUT}
              placeholder="VD: 1 hoặc Đầu tiên"
              value={specific?.disbursementTime || ''}
              onChange={e => patch({ disbursementTime: e.target.value })}
            />
          </div>
        </div>
      </Group>

      {/* 3. Đề xuất giải ngân */}
      <Group title="3. Đề xuất giải ngân" accent="border-warn/50 text-warn">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className={LABEL}>Số tiền giải ngân (VNĐ)</label>
            <input
              className={`${INPUT} font-mono font-bold text-accent`}
              placeholder="VD: 1,000,000,000"
              value={specific?.amount || common?.totalAmount || ''}
              onChange={e => handleAmountChange(e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>Mục đích giải ngân</label>
            <input
              className={INPUT}
              placeholder="VD: Thanh toán tiền mua nguyên vật liệu..."
              value={specific?.purpose || ''}
              onChange={e => patch({ purpose: e.target.value })}
            />
          </div>
        </div>
      </Group>

      {/* 4. Thông tin thanh toán & Bên thụ hưởng */}
      <Group title="4. Thông tin thanh toán & Bên thụ hưởng" accent="border-accent/50 text-accent">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className={LABEL}>Khoản mục thanh toán</label>
            <input
              className={INPUT}
              placeholder="VD: Mua thép cuộn"
              value={specific?.paymentItem || ''}
              onChange={e => patch({ paymentItem: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Số - ngày Hóa đơn/HĐ</label>
            <input
              className={INPUT}
              placeholder="VD: HĐ 01/2026 ngày 10/02/2026"
              value={specific?.invoiceDoc || ''}
              onChange={e => patch({ invoiceDoc: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Trị giá Hóa đơn/HĐ</label>
            <input
              className={`${INPUT} font-mono`}
              placeholder="VD: 1,200,000,000"
              value={specific?.invoiceValue || ''}
              onChange={e => patch({ invoiceValue: formatMoneyInput(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className={LABEL}>Số tài khoản thụ hưởng</label>
            <input
              className={`${INPUT} font-mono`}
              placeholder="VD: 001100223344"
              value={specific?.benAccNo || ''}
              onChange={e => patch({ benAccNo: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Chủ tài khoản thụ hưởng</label>
            <input
              className={INPUT}
              placeholder="VD: CÔNG TY CP THÉP VIỆT"
              value={specific?.benAccOwner || ''}
              onChange={e => patch({ benAccOwner: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Ngân hàng thụ hưởng</label>
            <input
              list="bm02-bank-options"
              className={INPUT}
              placeholder="VD: Vietcombank - CN Kỳ Đồng"
              value={specific?.benBank || ''}
              onChange={e => patch({ benBank: e.target.value })}
            />
            <datalist id="bm02-bank-options">
              {BANK_LIST.map(b => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <label className={LABEL}>Mã CIF quản lý TKV</label>
          <input
            className={`${INPUT} font-mono sm:w-1/3`}
            placeholder="VD: 000999"
            value={specific?.tkvCif || ''}
            onChange={e => patch({ tkvCif: e.target.value })}
          />
        </div>
      </Group>
    </div>
  );
};
