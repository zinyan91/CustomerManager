import React, { useEffect, useState, useMemo } from 'react';
import type { DossierCommon } from '../registry/types';
import type {
  Bm01Specific,
  Bm01CustomerType,
  Bm01DisbursementMethod,
  Bm01TransferType,
} from '../registry/templates/bm01DeNghiGiaiNgan';
import { CustomerPicker } from '../../ui/CustomerPicker';
import { VhttBranchInput } from './VhttBranchInput';
import { DateInput } from '../../DateInput';
import { fetchCustomersAPI } from '../../../lib/api';
import { formatMoneyInput } from '../../../lib/utils';
import { moneyTextToWords } from '../../../lib/numberToWords';
import { splitNumberList } from '../../../lib/customerValidation';
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

export const Bm01SpecificForm: React.FC<{
  common: DossierCommon;
  specific: Bm01Specific;
  patch: (p: Partial<Bm01Specific>) => void;
}> = ({ common, specific, patch }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomersAPI().then(setCustomers).catch(() => {});
  }, []);

  const activeCustomer = useMemo(() => {
    if (selectedCustomerId !== null) {
      const found = customers.find(c => c.Id === selectedCustomerId);
      if (found) return found;
    }
    const cif = specific?.cif1 || common?.partyA?.cif;
    if (cif) {
      const found = customers.find(c => c.CifKh === cif);
      if (found) return found;
    }
    const name = specific?.name1 || common?.partyA?.name;
    if (name) {
      const found = customers.find(c => c.FullName && c.FullName.toLowerCase() === name.toLowerCase());
      if (found) return found;
    }
    return null;
  }, [customers, selectedCustomerId, specific?.cif1, specific?.name1, common?.partyA?.cif, common?.partyA?.name]);

  const availableAccounts = useMemo(() => {
    const list: { accNo: string; owner: string; label: string; isSpouse?: boolean }[] = [];
    const seen = new Set<string>();

    const add = (acc: string, owner: string, label: string, isSpouse = false) => {
      const clean = acc.trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        list.push({ accNo: clean, owner, label, isSpouse });
      }
    };

    if (activeCustomer) {
      if (activeCustomer.AccountNumber) {
        const parts = splitNumberList(activeCustomer.AccountNumber);
        parts.forEach((p, idx) => {
          const numLabel = parts.length > 1 ? ` (TK ${idx + 1})` : '';
          add(p, activeCustomer.FullName, `${activeCustomer.FullName}${numLabel}`);
        });
      }
      if (activeCustomer.SpouseAccountNumber) {
        const parts = splitNumberList(activeCustomer.SpouseAccountNumber);
        const spouseName = activeCustomer.SpouseName || specific?.name2 || 'Vợ/Chồng';
        parts.forEach((p, idx) => {
          const numLabel = parts.length > 1 ? ` (TK ${idx + 1})` : '';
          add(p, spouseName, `${spouseName} (Vợ/Chồng)${numLabel}`, true);
        });
      }
    }

    if (common?.bank?.accNo) {
      const parts = splitNumberList(common.bank.accNo);
      parts.forEach(p => {
        add(p, common.bank?.owner || 'Bên vay', `${common.bank?.owner || 'Bên vay'} (Hồ sơ)`);
      });
    }

    return list;
  }, [activeCustomer, specific?.name2, common?.bank?.accNo, common?.bank?.owner]);

  const customerType: Bm01CustomerType = specific?.customerType || 'single';
  const method: Bm01DisbursementMethod = specific?.disbursementMethod || 'transfer';
  const transferSubType: Bm01TransferType = specific?.transferSubType || 'transfer';

  const handleSelectCustomer = (id: number | null) => {
    setSelectedCustomerId(id);
    if (id !== null) {
      const c = customers.find(item => item.Id === id);
      if (c) {
        const isMarried = Boolean(
          c.SpouseName?.trim() ||
          (c.MaritalStatus && c.MaritalStatus.toLowerCase().includes('kết hôn')) ||
          c.CifKhlq?.trim()
        );
        const accs = c.AccountNumber ? splitNumberList(c.AccountNumber) : [];
        patch({
          customerType: isMarried ? 'married' : 'single',
          name1: c.FullName,
          cif1: c.CifKh,
          cccd1: c.NationalId || '',
          name2: isMarried ? (c.SpouseName || '') : '',
          cif2: isMarried ? (c.CifKhlq || '') : '',
          cccd2: isMarried ? (c.SpouseNationalId || '') : '',
          // Tài khoản trích thu phí giải ngân là của Khách hàng: lấy tài khoản đầu tiên nếu có nhiều STK
          feeAccNo: accs[0] || c.AccountNumber || '',
        });
      }
    }
  };

  useEffect(() => {
    const updates: Partial<Bm01Specific> = {};
    if (!specific?.name1 && common?.partyA?.name) updates.name1 = common.partyA.name;
    if (!specific?.cif1 && common?.partyA?.cif) updates.cif1 = common.partyA.cif;
    if (!specific?.cccd1 && common?.partyA?.cccd) updates.cccd1 = common.partyA.cccd;
    if (!specific?.feeAccNo) {
      if (availableAccounts.length > 0) {
        updates.feeAccNo = availableAccounts[0].accNo;
      } else if (common?.bank?.accNo) {
        const accs = splitNumberList(common.bank.accNo);
        updates.feeAccNo = accs[0] || common.bank.accNo;
      }
    }
    if (Object.keys(updates).length > 0) {
      patch(updates);
    }
  }, [common, specific, patch, availableAccounts]);

  const handleTransferAmountChange = (val: string) => {
    const formatted = formatMoneyInput(val);
    patch({
      transferAmount: formatted,
      transferAmountWords: moneyTextToWords(formatted),
    });
  };

  const handleCashAmountChange = (val: string) => {
    const formatted = formatMoneyInput(val);
    patch({
      cashAmount: formatted,
      cashAmountWords: moneyTextToWords(formatted),
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Phân loại Khách hàng & Chọn nhanh */}
      <Group title="1. Thông tin Khách hàng" accent="border-accent/50 text-accent">
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Chọn nhanh từ Danh sách Khách hàng</label>
            <CustomerPicker
              customers={customers}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={handleSelectCustomer}
              placeholder="— Tìm theo tên, CIF, SĐT để điền hồ sơ —"
            />
          </div>

          <div>
            <label className={LABEL}>Loại khách hàng</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const hasSpouse = Boolean(
                    (activeCustomer?.SpouseName && activeCustomer.SpouseName.trim()) ||
                    (activeCustomer?.MaritalStatus && activeCustomer.MaritalStatus.toLowerCase().includes('kết hôn')) ||
                    (specific?.name2 && specific.name2.trim())
                  );
                  patch({ customerType: hasSpouse ? 'married' : 'single' });
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  customerType !== 'org'
                    ? 'bg-accent text-accent-ink border-accent shadow-sm'
                    : 'bg-surface/70 text-ink-muted border-line/70 hover:border-accent'
                }`}
              >
                👤 Khách hàng Cá nhân
              </button>
              <button
                type="button"
                onClick={() => patch({ customerType: 'org' })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  customerType === 'org'
                    ? 'bg-accent text-accent-ink border-accent shadow-sm'
                    : 'bg-surface/70 text-ink-muted border-line/70 hover:border-accent'
                }`}
              >
                🏢 Doanh nghiệp / Tổ chức
              </button>
            </div>
          </div>

          {/* Form thông tin Khách hàng Cá nhân (Tự động suy ra Độc thân hoặc Vợ chồng) */}
          {customerType !== 'org' && (
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-accent uppercase">
                    {customerType === 'married' ? 'Người thứ 1 (Chồng / Vợ)' : 'Thông tin Cá nhân (Bên vay)'}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-ink select-none">
                    <input
                      type="checkbox"
                      checked={customerType === 'married'}
                      onChange={(e) => {
                        const isNowMarried = e.target.checked;
                        patch({
                          customerType: isNowMarried ? 'married' : 'single',
                          name2: isNowMarried ? (activeCustomer?.SpouseName || specific?.name2 || '') : '',
                          cif2: isNowMarried ? (activeCustomer?.CifKhlq || specific?.cif2 || '') : '',
                          cccd2: isNowMarried ? (activeCustomer?.SpouseNationalId || specific?.cccd2 || '') : '',
                        });
                      }}
                      className="accent-accent cursor-pointer rounded"
                    />
                    <span>Đã kết hôn (Kèm thông tin Vợ / Chồng)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className={LABEL}>Họ và tên</label>
                    <input
                      className={INPUT}
                      placeholder="VD: Nguyễn Văn A"
                      value={specific?.name1 ?? common?.partyA?.name ?? ''}
                      onChange={e => patch({ name1: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Mã CIF</label>
                    <input
                      className={`${INPUT} font-mono`}
                      placeholder="VD: 000001"
                      value={specific?.cif1 ?? common?.partyA?.cif ?? ''}
                      onChange={e => patch({ cif1: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={LABEL}>Số CCCD / CC / Hộ chiếu</label>
                    <input
                      className={`${INPUT} font-mono`}
                      placeholder="VD: 0123414234"
                      value={specific?.cccd1 ?? common?.partyA?.cccd ?? ''}
                      onChange={e => patch({ cccd1: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Người thứ 2 (Vợ / Chồng) - Chỉ hiện khi Đã kết hôn */}
              {customerType === 'married' && (
                <div className="pt-2 border-t border-line/50 space-y-1.5 animate-in fade-in duration-150">
                  <div className="text-[11px] font-bold text-accent uppercase">
                    Người thứ 2 (Vợ / Chồng)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className={LABEL}>Họ và tên</label>
                      <input
                        className={INPUT}
                        placeholder="VD: Trần Thị B"
                        value={specific?.name2 ?? ''}
                        onChange={e => patch({ name2: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Mã CIF</label>
                      <input
                        className={`${INPUT} font-mono`}
                        placeholder="VD: 000002"
                        value={specific?.cif2 ?? ''}
                        onChange={e => patch({ cif2: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={LABEL}>Số CCCD</label>
                      <input
                        className={`${INPUT} font-mono`}
                        placeholder="VD: 0791234567"
                        value={specific?.cccd2 ?? ''}
                        onChange={e => patch({ cccd2: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trường nhập thông tin cho Doanh nghiệp / Tổ chức */}
          {customerType === 'org' && (
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={LABEL}>Tên tổ chức</label>
                  <input
                    className={INPUT}
                    placeholder="VD: Công ty TNHH Thương Mại ABC"
                    value={specific?.orgName ?? ''}
                    onChange={e => patch({ orgName: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL}>MSDN / Số ĐKKD / GPHĐ</label>
                  <input
                    className={`${INPUT} font-mono`}
                    placeholder="VD: 0312345678"
                    value={specific?.orgRegNo ?? ''}
                    onChange={e => patch({ orgRegNo: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={LABEL}>Người đại diện</label>
                  <input
                    className={INPUT}
                    placeholder="VD: Nguyễn Văn C"
                    value={specific?.repName ?? ''}
                    onChange={e => patch({ repName: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL}>Chức vụ</label>
                  <input
                    className={INPUT}
                    placeholder="VD: Giám đốc / Tổng giám đốc"
                    value={specific?.repPosition ?? ''}
                    onChange={e => patch({ repPosition: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={LABEL}>Văn bản uỷ quyền số (nếu có)</label>
                  <input
                    className={INPUT}
                    placeholder="VD: 01/UQ-ABC"
                    value={specific?.authDocNo ?? ''}
                    onChange={e => patch({ authDocNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL}>Ngày ký ủy quyền</label>
                  <DateInput
                    className={INPUT}
                    value={specific?.authDocDate ?? ''}
                    onChange={v => patch({ authDocDate: v })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Group>

      {/* 2. Kính gửi & Hợp đồng tín dụng */}
      <Group title="2. Cơ quan tiếp nhận & Hợp đồng tín dụng" accent="border-pos/50 text-pos">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <VhttBranchInput
            label="Vietbank tiếp nhận"
            inputClassName={INPUT}
            labelClassName={LABEL}
            branchType={specific?.branchType}
            branchName={specific?.branchName}
            onChange={patch}
          />
          <div>
            <label className={LABEL}>Địa danh lập văn bản</label>
            <input
              className={INPUT}
              placeholder="VD: TP. Hồ Chí Minh"
              value={specific?.docPlace ?? ''}
              onChange={e => patch({ docPlace: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className={LABEL}>Ngày lập đề nghị</label>
            <DateInput
              className={INPUT}
              value={specific?.docDate ?? common?.contractDate ?? ''}
              onChange={v => patch({ docDate: v })}
            />
          </div>
          <div>
            <label className={LABEL}>Hợp đồng tín dụng số</label>
            <input
              className={`${INPUT} font-mono`}
              placeholder="VD: 123/2026/HĐTD-VB"
              value={specific?.loanContractNo ?? ''}
              onChange={e => patch({ loanContractNo: e.target.value })}
            />
          </div>
          <div>
            <label className={LABEL}>Ngày ký HĐTD</label>
            <DateInput
              className={INPUT}
              value={specific?.loanContractDate ?? ''}
              onChange={v => patch({ loanContractDate: v })}
            />
          </div>
        </div>
      </Group>

      {/* 3. Phương thức giải ngân: Chỉ hiển thị 1 trong 2 */}
      <Group title="3. Phương thức giải ngân (Bên thụ hưởng nhận tiền)" accent="border-warn/50 text-warn">
        <div>
          <label className={LABEL}>Chọn phương thức giải ngân</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => patch({ disbursementMethod: 'transfer' })}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                method === 'transfer'
                  ? 'bg-accent text-accent-ink border-accent shadow-sm'
                  : 'bg-surface/70 text-ink-muted border-line/70 hover:border-accent'
              }`}
            >
              🏦 Chuyển khoản
            </button>
            <button
              type="button"
              onClick={() => patch({ disbursementMethod: 'cash' })}
              className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                method === 'cash'
                  ? 'bg-accent text-accent-ink border-accent shadow-sm'
                  : 'bg-surface/70 text-ink-muted border-line/70 hover:border-accent'
              }`}
            >
              💵 Nhận tiền mặt
            </button>
          </div>
        </div>

        {/* Form chi tiết Chuyển khoản */}
        {method === 'transfer' && (
          <div className="space-y-2.5 pt-1">
            <div>
              <label className={LABEL}>Loại hình chuyển khoản</label>
              <select
                className={INPUT}
                value={transferSubType}
                onChange={e => patch({ transferSubType: e.target.value as Bm01TransferType })}
              >
                <option value="transfer">Chuyển khoản thông thường</option>
                <option value="freeze">Chuyển khoản và phong tỏa</option>
                <option value="saving_freeze">Chuyển khoản và mở thẻ tiết kiệm phong tỏa</option>
                <option value="all">Đầy đủ (Chuyển khoản / Phong tỏa / Thẻ tiết kiệm...)</option>
              </select>
            </div>

            {(transferSubType === 'freeze' || transferSubType === 'saving_freeze' || transferSubType === 'all') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={LABEL}>Biên bản thỏa thuận số</label>
                  <input
                    className={INPUT}
                    placeholder="VD: 01/2026/BBTT"
                    value={specific?.agreementNo ?? ''}
                    onChange={e => patch({ agreementNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className={LABEL}>Ngày ký BBTT</label>
                  <DateInput
                    className={INPUT}
                    value={specific?.agreementDate ?? ''}
                    onChange={v => patch({ agreementDate: v })}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={LABEL}>Số tiền giải ngân (VNĐ)</label>
              <input
                className={`${INPUT} font-mono font-bold text-accent`}
                placeholder="VD: 500,000,000"
                value={specific?.transferAmount ?? common?.totalAmount ?? ''}
                onChange={e => handleTransferAmountChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className={LABEL}>Số tài khoản thụ hưởng (người nhận)</label>
                <input
                  className={`${INPUT} font-mono`}
                  placeholder="VD: 001100223344"
                  value={specific?.transferAccNo || ''}
                  onChange={e => patch({ transferAccNo: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL}>Tên Chủ tài khoản thụ hưởng</label>
                <input
                  className={INPUT}
                  placeholder="VD: NGUYỄN THỊ THU HƯƠNG / CÔNG TY ABC"
                  value={specific?.transferAccOwner || ''}
                  onChange={e => patch({ transferAccOwner: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className={LABEL}>Ngân hàng thụ hưởng</label>
                <input
                  list="bm01-bank-options"
                  className={INPUT}
                  placeholder="Chọn hoặc nhập tên ngân hàng..."
                  value={specific?.transferBankName || ''}
                  onChange={e => patch({ transferBankName: e.target.value })}
                />
                <datalist id="bm01-bank-options">
                  {BANK_LIST.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={LABEL}>Chi nhánh</label>
                <input
                  className={INPUT}
                  placeholder="VD: Chi nhánh Kỳ Đồng / PGD An Phú"
                  value={specific?.transferBankBranch || ''}
                  onChange={e => patch({ transferBankBranch: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={LABEL}>Mục đích chuyển khoản</label>
              <input
                className={INPUT}
                placeholder="VD: Thanh toán tiền mua bất động sản..."
                value={specific?.transferPurpose || ''}
                onChange={e => patch({ transferPurpose: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Form chi tiết Nhận tiền mặt */}
        {method === 'cash' && (
          <div className="space-y-2.5 pt-1">
            <div>
              <label className={LABEL}>Số tiền nhận tiền mặt (VNĐ)</label>
              <input
                className={`${INPUT} font-mono font-bold text-accent`}
                placeholder="VD: 200,000,000"
                value={specific?.cashAmount || common?.totalAmount || ''}
                onChange={e => handleCashAmountChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className={LABEL}>Họ tên người nhận tiền mặt</label>
                <input
                  className={INPUT}
                  placeholder="VD: NGUYỄN THỊ THU HƯƠNG (Người bán)"
                  value={specific?.cashReceiverName || ''}
                  onChange={e => patch({ cashReceiverName: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL}>Giấy CCCD / CC / Hộ chiếu người nhận</label>
                <input
                  className={`${INPUT} font-mono`}
                  placeholder="VD: 079123456789"
                  value={specific?.cashReceiverCccd || ''}
                  onChange={e => patch({ cashReceiverCccd: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={LABEL}>Mục đích nhận tiền mặt</label>
              <input
                className={INPUT}
                placeholder="VD: Thanh toán chi phí nhân công sửa chữa..."
                value={specific?.cashPurpose || ''}
                onChange={e => patch({ cashPurpose: e.target.value })}
              />
            </div>
          </div>
        )}
      </Group>

      {/* 4. Tài khoản trích thu phí */}
      <Group title="4. Tài khoản trích thu phí giải ngân" accent="border-accent/50 text-accent">
        <div className="space-y-3">
          {availableAccounts.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={LABEL}>
                  Danh sách tài khoản ({availableAccounts.length} tài khoản)
                </label>
                {availableAccounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const joined = availableAccounts.map(a => a.accNo).join(' / ');
                      patch({ feeAccNo: joined });
                    }}
                    className="text-[11px] font-medium text-accent hover:underline cursor-pointer"
                  >
                    Ghép tất cả ({availableAccounts.length} TK)
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {availableAccounts.map(acc => {
                  const isSelected = (specific?.feeAccNo || '').trim() === acc.accNo;
                  return (
                    <div
                      key={acc.accNo}
                      onClick={() => patch({ feeAccNo: acc.accNo })}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-accent/10 border-accent text-ink shadow-2xs'
                          : 'bg-surface/70 border-line/70 hover:border-accent/60 text-ink-muted hover:text-ink'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="radio"
                          name="bm01-fee-account-choice"
                          checked={isSelected}
                          onChange={() => patch({ feeAccNo: acc.accNo })}
                          className="accent-accent cursor-pointer shrink-0"
                        />
                        <div className="min-w-0 truncate">
                          <div className="font-mono font-bold text-xs text-ink truncate">
                            {acc.accNo}
                          </div>
                          <div className="text-[11px] text-ink-muted truncate">
                            {acc.label}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <span className="text-[11px] font-bold text-accent">✓ Đang chọn</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              patch({ feeAccNo: acc.accNo });
                            }}
                            className="text-[11px] font-medium text-ink-faint hover:text-accent px-2 py-0.5 rounded border border-line/70 hover:border-accent cursor-pointer"
                          >
                            Chọn
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-ink-muted bg-surface/60 border border-line/60 rounded-xl p-2.5">
              Khách hàng chưa có số tài khoản lưu trong hồ sơ. Vui lòng nhập số tài khoản bên dưới.
            </div>
          )}

          <div>
            <label className={LABEL}>
              {availableAccounts.length > 0 ? 'Số tài khoản trích phí (có thể sửa hoặc nhập số khác)' : 'Số tài khoản thanh toán trích phí'}
            </label>
            <input
              list="bm01-fee-accounts-datalist"
              className={`${INPUT} font-mono font-bold text-accent`}
              placeholder="VD: 000000123456"
              value={specific?.feeAccNo || ''}
              onChange={e => patch({ feeAccNo: e.target.value })}
            />
            <datalist id="bm01-fee-accounts-datalist">
              {availableAccounts.map(a => (
                <option key={a.accNo} value={a.accNo}>
                  {a.accNo} — {a.label}
                </option>
              ))}
            </datalist>
            <div className="text-[11px] text-ink-muted mt-1">
              Số tài khoản này sẽ được in trên Giấy đề nghị giải ngân để Vietbank trích thu phí.
            </div>
          </div>
        </div>
      </Group>
    </div>
  );
};
