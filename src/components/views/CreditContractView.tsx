import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Trash2, Save, X, Banknote, AlertTriangle, Building2 } from 'lucide-react';
import {
  fetchCustomersAPI, fetchContractsByCustomerAPI,
  fetchCreditContractsByCustomerAPI, saveCreditContractAPI,
  deleteCreditContractAPI, countKunnOfCreditContractAPI,
  fetchCollateralsByCustomerAPI, fetchRepaymentSchedulesAPI,
} from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';
import { useWork } from '../../context/WorkContext';
import { fmtDate, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { summarizeCreditContracts, kunnRevolvingStatus } from '../../lib/creditContract';
import { computeOutstandingBalance } from '../../lib/loanMath';
import { getEffectiveLtv, usableCapacity, appraisalStatus, appraisalExpiryDate } from '../../lib/collateralMath';
import { allowedPurposes } from '../../lib/loanProductRules';
import { DateInput } from '../DateInput';
import type { Customer, CreditContract, LoanContract, Collateral, RepaymentSchedule } from '../../types';

const LOAN_METHODS = [
  'Hạn mức tín dụng',
  'Hạn mức tín dụng từng lần',
  'Cho vay từng lần',
  'Hạn mức thẻ tín dụng',
  'Cầm cố sổ tiết kiệm',
];

const fmtMoney = (v?: number | null) =>
  v !== undefined && v !== null ? v.toLocaleString('vi-VN') + ' VNĐ' : '—';

export const CreditContractView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { selectedCustomerId, setSelectedCustomerId, requestDisburse } = useWork();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contracts, setContracts] = useState<CreditContract[]>([]);
  const [kunns, setKunns] = useState<LoanContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [schedulesMap, setSchedulesMap] = useState<Record<number, RepaymentSchedule[]>>({});
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CreditContract | null>(null);
  const [form, setForm] = useState<Partial<CreditContract>>({});
  const [formAmount, setFormAmount] = useState('');
  const [formApprovalAmount, setFormApprovalAmount] = useState('');
  const [useSharedApproval, setUseSharedApproval] = useState(false);
  const [selectedCollateralIds, setSelectedCollateralIds] = useState<number[]>([]);
  const [showSettled, setShowSettled] = useState(false);

  const todayIso = new Date().toISOString().split('T')[0];

  const containerCardBg = isLight
    ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
    : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl';
  const inputStyle = isLight
    ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
    : 'bg-slate-950 border-slate-700 text-slate-100 focus:border-sky-500';
  const labelStyle = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500';

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotify({ type, message });
    setTimeout(() => setNotify(null), 5000);
  };

  useEffect(() => {
    fetchCustomersAPI({}).then(setAllCustomers);
  }, []);

  const loadCustomer = async (c: Customer | null) => {
    setCustomer(c);
    setShowForm(false);
    setEditing(null);
    if (!c) {
      setContracts([]); setKunns([]); setCollaterals([]); setSchedulesMap({});
      return;
    }
    setLoading(true);
    try {
      const [ccs, ks, cols] = await Promise.all([
        fetchCreditContractsByCustomerAPI(c.Id),
        fetchContractsByCustomerAPI(c.Id),
        fetchCollateralsByCustomerAPI(c.Id),
      ]);
      setContracts(ccs);
      setKunns(ks);
      setCollaterals(cols);

      // Dư nợ phải tính từ lịch thu nợ, đúng nguồn tab KUNN đang dùng. Lấy
      // CurrentBalance đã lưu sẽ ra số khác trên hai tab của cùng một khách.
      const map: Record<number, RepaymentSchedule[]> = {};
      await Promise.all(ks.map(async k => {
        try { map[k.Id] = await fetchRepaymentSchedulesAPI(k.Id); } catch {}
      }));
      setSchedulesMap(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allCustomers.length === 0) return;
    if (selectedCustomerId && selectedCustomerId !== customer?.Id) {
      const c = allCustomers.find(x => x.Id === selectedCustomerId);
      if (c) loadCustomer(c);
    }
  }, [selectedCustomerId, allCustomers]);

  const outstandingOf = (k: LoanContract) => computeOutstandingBalance(schedulesMap[k.Id], k);

  const summaries = useMemo(
    () => summarizeCreditContracts(contracts, kunns, {
      getOutstanding: outstandingOf,
      today: todayIso,
    }),
    [contracts, kunns, schedulesMap, todayIso]
  );

  const lockedByContract = useMemo(() => {
    const map: Record<number, { count: number; amount: number }> = {};
    for (const k of kunns) {
      if (k.IsSettled || !k.CreditContractId) continue;
      const cc = contracts.find(x => x.Id === k.CreditContractId);
      if (kunnRevolvingStatus({ KunnDueDate: k.KunnDueDate }, cc).state !== 'locked') continue;
      const bal = outstandingOf(k);
      // Dư nợ đã về 0 thì không còn gì bị khoá, đánh dấu chỉ gây nhiễu.
      if (bal <= 0) continue;
      const cur = map[k.CreditContractId] || { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += bal;
      map[k.CreditContractId] = cur;
    }
    return map;
  }, [kunns, contracts, schedulesMap]);

  const visibleSummaries = useMemo(
    () => showSettled ? summaries : summaries.filter(s => !s.contract.IsClosed),
    [summaries, showSettled]
  );

  const closedCount = summaries.filter(s => s.contract.IsClosed).length;

  const openNew = () => {
    setEditing(null);
    setForm({
      CustomerId: customer?.Id,
      LoanMethod: LOAN_METHODS[0],
      LoanTenorMonths: 12,
      IsClosed: false,
    });
    setFormAmount('');
    setFormApprovalAmount('');
    setUseSharedApproval(false);
    setSelectedCollateralIds([]);
    setShowForm(true);
  };

  const openEdit = (cc: CreditContract) => {
    setEditing(cc);
    setForm({ ...cc });
    setFormAmount(cc.ContractAmount ? cc.ContractAmount.toLocaleString('vi-VN') : '');
    setFormApprovalAmount(cc.ApprovalAmount ? cc.ApprovalAmount.toLocaleString('vi-VN') : '');
    setUseSharedApproval(!!(cc.ApprovalCode || '').trim());
    setSelectedCollateralIds(
      (cc.CollateralIds || '').split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n))
    );
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const hdtd = (form.HdtdNumber || '').trim();
    if (!hdtd) {
      showNotify('error', 'Nhập số HĐTD.');
      return;
    }
    if (selectedCollateralIds.length === 0) {
      showNotify('error', 'Chọn ít nhất 01 tài sản bảo đảm cho HĐTD.');
      return;
    }

    setLoading(true);
    try {
      const payload: Partial<CreditContract> = {
        ...form,
        Id: editing?.Id,
        CustomerId: customer.Id,
        HdtdNumber: hdtd,
        ContractAmount: parseMoneyInput(formAmount) || null,
        ApprovalCode: useSharedApproval ? (form.ApprovalCode || '').trim() || null : null,
        ApprovalAmount: useSharedApproval ? (parseMoneyInput(formApprovalAmount) || null) : null,
        CollateralIds: selectedCollateralIds.join(','),
      };
      await saveCreditContractAPI(payload);
      showNotify('success', editing ? 'Đã cập nhật HĐTD.' : 'Đã tạo HĐTD mới.');
      setShowForm(false);
      await loadCustomer(customer);
    } catch (err: any) {
      showNotify('error', err.message || 'Không lưu được HĐTD.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cc: CreditContract) => {
    const n = await countKunnOfCreditContractAPI(cc.Id);
    if (n > 0) {
      showNotify('error', `HĐTD ${cc.HdtdNumber} còn ${n} KUNN. Xoá KUNN trước.`);
      return;
    }
    if (!window.confirm(`Xoá HĐTD "${cc.HdtdNumber}"?\nHành động này không thể hoàn tác.`)) return;
    setLoading(true);
    try {
      await deleteCreditContractAPI(cc.Id);
      showNotify('success', `Đã xoá HĐTD ${cc.HdtdNumber}`);
      await loadCustomer(customer);
    } catch (err: any) {
      showNotify('error', err.message || 'Không xoá được HĐTD.');
    } finally {
      setLoading(false);
    }
  };

  const purposeOptions = useMemo(() => allowedPurposes(form.LoanMethod), [form.LoanMethod]);

  const tongKhaNangBaoDam = useMemo(
    () => collaterals
      .filter(c => selectedCollateralIds.includes(c.Id))
      .reduce((s, c) => s + usableCapacity(c, todayIso), 0),
    [collaterals, selectedCollateralIds, todayIso]
  );

  const vuotKhaNangBaoDam = tongKhaNangBaoDam > 0
    && parseMoneyInput(formAmount) > tongKhaNangBaoDam;

  return (
    <div className="space-y-4">
      {notify && (
        <div className={`p-3 rounded-xl border text-xs font-semibold ${
          notify.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
        }`}>{notify.message}</div>
      )}

      <div className={`${containerCardBg} rounded-2xl p-4 border space-y-3`}>
        <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 font-bold text-xs uppercase tracking-wider">
          <FileText className="w-4 h-4" />
          <span>Quản lý Hợp đồng Tín dụng</span>
        </div>
        <div>
          <label className={`block mb-1 ${labelStyle}`}>Khách hàng ({allCustomers.length} KH)</label>
          <select
            value={customer?.Id ?? ''}
            onChange={e => {
              const id = parseInt(e.target.value, 10);
              const c = allCustomers.find(x => x.Id === id) || null;
              setSelectedCustomerId(c?.Id ?? null);
              loadCustomer(c);
            }}
            className={`w-full rounded-xl p-2.5 text-sm font-semibold ${inputStyle}`}
          >
            <option value="">— Chọn khách hàng —</option>
            {allCustomers.map(c => (
              <option key={c.Id} value={c.Id}>{c.FullName} — CIF {c.CifKh}</option>
            ))}
          </select>
        </div>
      </div>

      {customer && (
        <div className={`${containerCardBg} rounded-2xl border overflow-hidden`}>
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Hợp đồng của {customer.FullName} — {visibleSummaries.length} HĐTD
              {closedCount > 0 && (
                <button onClick={() => setShowSettled(v => !v)}
                  className="ml-3 font-normal normal-case text-[11px] text-sky-600 dark:text-sky-400 hover:underline">
                  {showSettled ? 'Ẩn' : 'Hiện'} {closedCount} HĐTD đã đóng
                </button>
              )}
            </div>
            <button onClick={openNew}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs">
              <Plus className="w-3.5 h-3.5" /><span>Tạo HĐTD mới</span>
            </button>
          </div>

          {visibleSummaries.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              {loading ? 'Đang tải…' : 'Khách hàng chưa có HĐTD nào.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={isLight ? 'bg-slate-100 text-slate-600' : 'bg-slate-950 text-slate-400'}>
                  <tr>
                    <th className="p-3 whitespace-nowrap">SỐ HĐTD</th>
                    <th className="p-3 whitespace-nowrap">PHƯƠNG THỨC VAY</th>
                    <th className="p-3 text-right whitespace-nowrap">TỔNG MỨC CẤP</th>
                    <th className="p-3 text-right whitespace-nowrap">DƯ NỢ KUNN</th>
                    <th className="p-3 text-center whitespace-nowrap">HIỆU LỰC</th>
                    <th className="p-3 text-center whitespace-nowrap">KUNN</th>
                    <th className="p-3 text-center whitespace-nowrap">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
                  {visibleSummaries.map(s => (
                    <tr key={s.contract.Id} className={s.expired ? 'bg-rose-50/50 dark:bg-rose-950/20' : ''}>
                      <td className="p-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                        <button onClick={() => openEdit(s.contract)} className="hover:underline text-left">
                          {s.contract.HdtdNumber}
                        </button>
                        {s.contract.ApprovalCode && (
                          <div className="text-[10px] font-sans font-normal text-purple-500 mt-0.5">
                            Hạn mức duyệt: {s.contract.ApprovalCode}
                          </div>
                        )}
                      </td>
                      <td className="p-3">{s.contract.LoanMethod || '—'}</td>
                      <td className="p-3 text-right font-mono font-bold">{fmtMoney(s.contract.ContractAmount)}</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {fmtMoney(s.outstanding)}
                        {lockedByContract[s.contract.Id] && (
                          <div className="text-[10px] font-sans font-semibold text-rose-600 dark:text-rose-400">
                            khoá {fmtMoney(lockedByContract[s.contract.Id].amount)}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="font-mono">{fmtDate(s.contract.ContractEndDate)}</div>
                        {s.expired && (
                          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">HẾT HIỆU LỰC</div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold">{s.activeKunnCount}</span>
                        {s.settledKunnCount > 0 && (
                          <span className="text-slate-400"> +{s.settledKunnCount} đã TT</span>
                        )}
                        {s.kunnCount === 0 && (
                          <div className="text-[10px] text-slate-400">chưa giải ngân</div>
                        )}
                        {lockedByContract[s.contract.Id] && (
                          <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5"
                            title="KUNN đáo hạn sau ngày hết hiệu lực HĐTD: không giải ngân lại được, phải tất toán">
                            🔒 {lockedByContract[s.contract.Id].count} KUNN khoá
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(s.contract)}
                            title="Xem chi tiết / sửa HĐTD"
                            className={`flex items-center space-x-1 font-bold px-2.5 py-1.5 rounded-lg text-[11px] border ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-700 hover:border-sky-400'
                                : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-sky-500'
                            }`}>
                            <FileText className="w-3 h-3" /><span>Chi tiết</span>
                          </button>
                          {(() => {
                            const khoaGiaiNgan = s.expired || !!s.contract.IsClosed;
                            return (
                              <button
                                disabled={khoaGiaiNgan}
                                onClick={() => !khoaGiaiNgan && requestDisburse({ creditContractId: s.contract.Id, customerId: customer.Id })}
                                title={
                                  s.contract.IsClosed
                                    ? 'HĐTD đã đóng — không giải ngân được'
                                    : s.expired
                                      ? `HĐTD hết hiệu lực ${fmtDate(s.contract.ContractEndDate)} — không giải ngân được`
                                      : 'Giải ngân KUNN mới trên hợp đồng này'
                                }
                                className={`flex items-center space-x-1 font-bold px-2.5 py-1.5 rounded-lg text-[11px] ${
                                  khoaGiaiNgan
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                                }`}>
                                <Banknote className="w-3 h-3" /><span>Giải ngân</span>
                              </button>
                            );
                          })()}
                          <button onClick={() => handleDelete(s.contract)} title="Xoá HĐTD"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showForm && customer && (
        <form onSubmit={handleSave} className={`${containerCardBg} rounded-2xl p-4 border space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>{editing ? `Sửa HĐTD ${editing.HdtdNumber}` : 'Hợp đồng tín dụng mới'}</span>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Số HĐTD * (duy nhất trong khách hàng)</label>
              <input type="text" value={form.HdtdNumber || ''}
                onChange={e => setForm(f => ({ ...f, HdtdNumber: e.target.value }))}
                placeholder="2002/HĐTD/9653222"
                className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Phương thức vay *</label>
              <select value={form.LoanMethod || ''}
                onChange={e => setForm(f => ({ ...f, LoanMethod: e.target.value, LoanPurposeType: '' }))}
                className={`w-full rounded-xl p-2.5 text-sm ${inputStyle}`}>
                {LOAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Tổng mức cấp (HĐTD) *</label>
              <input type="text" value={formAmount}
                onChange={e => setFormAmount(formatMoneyInput(e.target.value))}
                placeholder="4.000.000.000"
                className={`w-full rounded-xl p-2.5 text-sm font-mono font-bold text-sky-600 dark:text-sky-400 ${inputStyle}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Ngày HĐ có hiệu lực</label>
              <DateInput value={form.ContractStartDate || ''}
                onChange={v => setForm(f => ({ ...f, ContractStartDate: v }))}
                className={`w-full rounded-xl p-2.5 text-sm font-mono ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Ngày kết thúc HĐ</label>
              <DateInput value={form.ContractEndDate || ''}
                onChange={v => setForm(f => ({ ...f, ContractEndDate: v }))}
                className={`w-full rounded-xl p-2.5 text-sm font-mono ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Thời hạn HĐTD (tháng)</label>
              <input type="number" value={form.LoanTenorMonths ?? ''}
                onChange={e => setForm(f => ({ ...f, LoanTenorMonths: parseInt(e.target.value, 10) || null }))}
                className={`w-full rounded-xl p-2.5 text-sm font-mono ${inputStyle}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Mục đích vay vốn</label>
              <select value={form.LoanPurposeType || ''}
                onChange={e => setForm(f => ({ ...f, LoanPurposeType: e.target.value }))}
                className={`w-full rounded-xl p-2.5 text-sm ${inputStyle}`}>
                <option value="">— Chọn —</option>
                {purposeOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Mô tả chi tiết mục đích</label>
              <input type="text" value={form.LoanPurpose || ''}
                onChange={e => setForm(f => ({ ...f, LoanPurpose: e.target.value }))}
                className={`w-full rounded-xl p-2.5 text-sm ${inputStyle}`} />
            </div>
          </div>

          <div className={`rounded-xl p-3 border ${isLight ? 'bg-purple-50/60 border-purple-200' : 'bg-purple-950/30 border-purple-500/30'}`}>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={useSharedApproval}
                onChange={e => setUseSharedApproval(e.target.checked)}
                className="w-4 h-4 accent-purple-600" />
              <span className="text-xs font-semibold">
                HĐTD này dùng chung hạn mức phê duyệt với HĐTD khác
              </span>
            </label>
            {useSharedApproval && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Số phê duyệt / Mã hạn mức được duyệt</label>
                  <input type="text" value={form.ApprovalCode || ''}
                    onChange={e => setForm(f => ({ ...f, ApprovalCode: e.target.value }))}
                    placeholder="PD-2026-001"
                    className={`w-full rounded-xl p-2.5 text-sm font-mono ${inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Hạn mức được duyệt</label>
                  <input type="text" value={formApprovalAmount}
                    onChange={e => setFormApprovalAmount(formatMoneyInput(e.target.value))}
                    className={`w-full rounded-xl p-2.5 text-sm font-mono ${inputStyle}`} />
                </div>
              </div>
            )}
          </div>

          <div>
            <div className={`mb-2 flex items-center space-x-2 ${labelStyle}`}>
              <Building2 className="w-3.5 h-3.5" />
              <span>Tài sản bảo đảm cho HĐTD *</span>
            </div>
            {collaterals.length === 0 ? (
              <div className="text-xs text-rose-500 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Chưa có TSBĐ. Thêm ở tab Định Giá TSĐB.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {collaterals.map(col => {
                  const isChecked = selectedCollateralIds.includes(col.Id);
                  const val = col.AppraisedValue || col.Value || 0;
                  const ltv = getEffectiveLtv(col);
                  const capacity = usableCapacity(col, todayIso);
                  const tinhTrang = appraisalStatus(col, todayIso);

                  return (
                    <div key={col.Id} className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                      isChecked
                        ? (isLight ? 'bg-sky-50 border-sky-400' : 'bg-sky-950/60 border-sky-500')
                        : (isLight ? 'bg-white border-slate-300 hover:border-sky-400' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700')
                    }`}>
                      <div className="flex items-start space-x-3 flex-1 min-w-[220px]">
                        <input type="checkbox" checked={isChecked}
                          onChange={e => setSelectedCollateralIds(prev =>
                            e.target.checked ? [...prev, col.Id] : prev.filter(x => x !== col.Id))}
                          className="w-4 h-4 rounded text-sky-600 mt-0.5" />
                        <div>
                          <div className="font-bold text-xs">
                            {col.AssetType || 'TSBĐ'} — {col.Address || col.AssetCode}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-3">
                            <span>Định giá: <strong>{fmtMoney(val)}</strong></span>
                            <span>LTV: <strong className="font-mono text-sky-600 dark:text-sky-400">{ltv}%</strong></span>
                            <span>Ngày định giá: <span className="font-mono">{fmtDate(col.AppraisalDate)}</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 block uppercase">Khả năng bảo đảm</span>
                        <span className={`text-xs font-mono font-bold ${
                          capacity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {fmtMoney(capacity)}
                        </span>
                        {capacity === 0 && (
                          <span className="block text-[10px] font-semibold text-rose-500">
                            {tinhTrang === 'expired'
                              ? `Định giá hết hiệu lực ${fmtDate(appraisalExpiryDate(col))}`
                              : 'Chưa có ngày định giá'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {selectedCollateralIds.length > 0 && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold flex flex-wrap items-center justify-between gap-3 ${
                    isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  }`}>
                    <span>TỔNG KHẢ NĂNG BẢO ĐẢM ({selectedCollateralIds.length} tài sản)</span>
                    <span className="font-mono">{fmtMoney(tongKhaNangBaoDam)}</span>
                  </div>
                )}

                {vuotKhaNangBaoDam && (
                  <div className={`p-3 rounded-xl border text-xs font-bold ${
                    isLight ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    Mức cấp {fmtMoney(parseMoneyInput(formAmount))} vượt khả năng bảo đảm {fmtMoney(tongKhaNangBaoDam)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={form.IsClosed ?? false}
                onChange={e => setForm(f => ({ ...f, IsClosed: e.target.checked }))}
                className="w-4 h-4 accent-rose-600" />
              <span className="text-xs font-medium">HĐTD đã đóng</span>
            </label>
            <button type="submit" disabled={loading}
              className="flex items-center space-x-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs">
              <Save className="w-3.5 h-3.5" /><span>{editing ? 'Cập nhật' : 'Tạo HĐTD'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
