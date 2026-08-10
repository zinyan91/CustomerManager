import React, { useState, useEffect, useMemo } from 'react';
import { UI } from '../../lib/uiClasses';
import { FileText, Plus, Trash2, Save, X, Banknote, AlertTriangle, Building2 } from 'lucide-react';
import {
  fetchCustomersAPI, fetchContractsByCustomerAPI,
  fetchCreditContractsByCustomerAPI, saveCreditContractAPI,
  deleteCreditContractAPI, countKunnOfCreditContractAPI,
  fetchCollateralsByCustomerAPI, fetchRepaymentSchedulesAPI,
} from '../../lib/api';
import { useWork } from '../../context/WorkContext';
import { fmtDate, fmtMoney, formatMoneyInput, parseMoneyInput, todayIso } from '../../lib/utils';
import { summarizeCreditContracts, canCloseCreditContract } from '../../lib/creditContract';
import { addMonthsToDate, computeOutstandingBalance } from '../../lib/loanMath';
import { getEffectiveLtv, usableCapacity, totalUsableCapacity, appraisalStatus, appraisalExpiryDate, collateralValue } from '../../lib/collateralMath';
import { allowedPurposes } from '../../lib/loanProductRules';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import type { Customer, CreditContract, LoanContract, Collateral, RepaymentSchedule } from '../../types';

const LOAN_METHODS = [
  'Hạn mức tín dụng',
  'Hạn mức tín dụng từng lần',
  'Cho vay từng lần',
  'Hạn mức thẻ tín dụng',
  'Cầm cố sổ tiết kiệm',
];

export const CreditContractView: React.FC = () => {
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

  const today = todayIso();

  const containerCardBg = UI.containerCardBg;
  const inputStyle = UI.inputStyle;
  const labelStyle = UI.labelStyle;

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

  useEffect(() => {
    if (!form.ContractStartDate || !form.LoanTenorMonths) return;
    const calculatedEnd = addMonthsToDate(form.ContractStartDate, form.LoanTenorMonths);
    if (calculatedEnd && calculatedEnd !== form.ContractEndDate) {
      setForm(prev => ({ ...prev, ContractEndDate: calculatedEnd }));
    }
  }, [form.ContractStartDate, form.LoanTenorMonths]);

  const outstandingOf = (k: LoanContract) => computeOutstandingBalance(schedulesMap[k.Id], k);

  const summaries = useMemo(
    () => summarizeCreditContracts(contracts, kunns, {
      getOutstanding: outstandingOf,
      today: today,
    }),
    [contracts, kunns, schedulesMap, today]
  );

  const visibleSummaries = useMemo(
    () => showSettled ? summaries : summaries.filter(s => !s.contract.IsClosed),
    [summaries, showSettled]
  );

  const closedCount = summaries.filter(s => s.contract.IsClosed).length;

  const closeCheck = useMemo(
    () => editing
      ? canCloseCreditContract(editing, kunns)
      : { allowed: true, unsettledKunnNumbers: [] },
    [editing, kunns]
  );

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
    if (form.IsClosed && editing) {
      const check = canCloseCreditContract(editing, kunns);
      if (!check.allowed) {
        showNotify('error',
          `Chưa tất toán: ${check.unsettledKunnNumbers.join(', ')}.`);
        return;
      }
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
    () => totalUsableCapacity(collaterals.filter(c => selectedCollateralIds.includes(c.Id)), today),
    [collaterals, selectedCollateralIds, today]
  );

  const vuotKhaNangBaoDam = tongKhaNangBaoDam > 0
    && parseMoneyInput(formAmount) > tongKhaNangBaoDam;

  return (
    <div className="space-y-4">
      <Toast toast={notify} onDismiss={() => setNotify(null)} />

      <div className={`${containerCardBg} rounded-lg p-4 border space-y-3`}>
        <div className="flex items-center space-x-2 text-accent font-bold text-xs tracking-tight">
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
            className={`w-full rounded-md p-2.5 text-sm font-semibold ${inputStyle}`}
          >
            <option value="">— Chọn khách hàng —</option>
            {allCustomers.map(c => (
              <option key={c.Id} value={c.Id}>{c.FullName} — CIF {c.CifKh}</option>
            ))}
          </select>
        </div>
      </div>

      {customer && (
        <div className={`${containerCardBg} rounded-lg border p-3 grid grid-cols-2 md:grid-cols-4 gap-3`}>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-faint">Mã CIF</div>
            <div className="font-mono font-bold text-sm text-accent">{customer.CifKh || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-faint">Khách hàng</div>
            <div className="font-bold text-sm truncate" title={customer.FullName}>{customer.FullName}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-faint">Số HĐTD đang chọn</div>
            <div className="font-mono font-bold text-sm text-accent truncate">
              {showForm
                ? (form.HdtdNumber?.trim() || (editing ? editing.HdtdNumber : 'HĐTD mới — chưa nhập số'))
                : '— chưa chọn —'}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-faint">Số HĐTD của KH</div>
            <div className="font-bold text-sm">
              {summaries.length} HĐTD
              {closedCount > 0 && (
                <span className="ml-1 text-[11px] font-normal text-ink-faint">
                  ({closedCount} đã đóng)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {customer && (
        <div className={`${containerCardBg} rounded-lg border overflow-hidden`}>
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-line">
            <div className="text-xs font-bold tracking-tight text-ink-faint">
              Hợp đồng của {customer.FullName} — {visibleSummaries.length} HĐTD
              <span className="ml-2 font-normal normal-case text-[11px] text-ink-faint">
                Nhấp vào dòng để xem chi tiết
              </span>
              {closedCount > 0 && (
                <button onClick={() => setShowSettled(v => !v)}
                  className="ml-3 font-normal normal-case text-[11px] text-accent hover:underline">
                  {showSettled ? 'Ẩn' : 'Hiện'} {closedCount} HĐTD đã đóng
                </button>
              )}
            </div>
            <button onClick={openNew}
              className="flex items-center space-x-1.5 bg-accent hover:opacity-90 text-accent-ink font-bold px-4 py-2 rounded-md text-xs">
              <Plus className="w-3.5 h-3.5" /><span>Tạo HĐTD mới</span>
            </button>
          </div>

          {visibleSummaries.length === 0 ? (
            <div className="p-8 text-center text-ink-faint text-sm">
              {loading ? 'Đang tải…' : 'Khách hàng chưa có HĐTD nào.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={'bg-panel-muted text-ink-muted'}>
                  <tr>
                    <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap">SỐ HĐTD</th>
                    <th className="px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap">PHƯƠNG THỨC VAY</th>
                    <th className="px-[var(--row-px)] py-[var(--row-py)] text-right whitespace-nowrap">TỔNG MỨC CẤP</th>
                    <th className="px-[var(--row-px)] py-[var(--row-py)] text-right whitespace-nowrap">DƯ NỢ KUNN</th>
                    <th className="px-[var(--row-px)] py-[var(--row-py)] text-center whitespace-nowrap">HIỆU LỰC</th>
                    <th className="px-[var(--row-px)] py-[var(--row-py)] text-center whitespace-nowrap">KUNN</th>
                    <th className="px-[var(--row-px)] py-[var(--row-py)] text-center whitespace-nowrap">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${'divide-line'}`}>
                  {visibleSummaries.map(s => (
                    <tr key={s.contract.Id}
                      onClick={() => openEdit(s.contract)}
                      className={`cursor-pointer transition-colors ${
                        s.expired
                          ? 'bg-neg-soft  hover:bg-neg-soft '
                          : 'hover:bg-panel-muted'
                      }`}>
                      <td className="px-[var(--row-px)] py-[var(--row-py)] font-mono font-bold text-accent">
                        {s.contract.HdtdNumber}
                        {s.contract.ApprovalCode && (
                          <div className="text-[10px] font-app font-normal text-accent mt-0.5">
                            Hạn mức duyệt: {s.contract.ApprovalCode}
                          </div>
                        )}
                      </td>
                      <td className="px-[var(--row-px)] py-[var(--row-py)]">{s.contract.LoanMethod || '—'}</td>
                      <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-bold">{fmtMoney(s.contract.ContractAmount)}</td>
                      <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-bold text-warn">
                        {fmtMoney(s.outstanding)}
                      </td>
                      <td className="px-[var(--row-px)] py-[var(--row-py)] text-center whitespace-nowrap">
                        <div className="font-mono">{fmtDate(s.contract.ContractEndDate)}</div>
                        {s.expired && (
                          <div className="text-[10px] font-bold text-neg">HẾT HIỆU LỰC</div>
                        )}
                      </td>
                      <td className="px-[var(--row-px)] py-[var(--row-py)] text-center">
                        <span className="font-bold">{s.activeKunnCount}</span>
                        {s.settledKunnCount > 0 && (
                          <span className="text-ink-faint"> +{s.settledKunnCount} đã TT</span>
                        )}
                        {s.kunnCount === 0 && (
                          <div className="text-[10px] text-ink-faint">chưa giải ngân</div>
                        )}
                      </td>
                      <td className="px-[var(--row-px)] py-[var(--row-py)]">
                        <div className="flex items-center justify-center gap-2">
                          {(() => {
                            const khoaGiaiNgan = !s.canDisburse;
                            return (
                              <button
                                disabled={khoaGiaiNgan}
                                onClick={e => {
                                  e.stopPropagation();
                                  if (!khoaGiaiNgan) requestDisburse({ creditContractId: s.contract.Id, customerId: customer.Id });
                                }}
                                className={`flex items-center space-x-1 font-bold px-2.5 py-1.5 rounded-lg text-[11px] ${
                                  khoaGiaiNgan
                                    ? 'bg-panel-muted text-ink-faint cursor-not-allowed'
                                    : 'bg-accent hover:opacity-90 text-accent-ink'
                                }`}>
                                <Banknote className="w-3 h-3" /><span>Giải ngân</span>
                              </button>
                            );
                          })()}
                          <button onClick={e => { e.stopPropagation(); handleDelete(s.contract); }} title="Xoá HĐTD"
                            className="p-1.5 rounded-lg text-neg hover:bg-neg-soft">
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
        <form onSubmit={handleSave} className={`${containerCardBg} rounded-lg p-4 border space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-pos font-bold text-xs tracking-tight">
              <FileText className="w-4 h-4" />
              <span>{editing ? `Sửa HĐTD ${editing.HdtdNumber}` : 'Hợp đồng tín dụng mới'}</span>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 text-ink-faint hover:text-ink-muted">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Số HĐTD * (duy nhất trong khách hàng)</label>
              <input type="text" value={form.HdtdNumber || ''}
                onChange={e => setForm(f => ({ ...f, HdtdNumber: e.target.value }))}
                placeholder="2002/HĐTD/9653222"
                className={`w-full rounded-md p-2.5 text-sm font-mono font-bold ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Phương thức vay *</label>
              <select value={form.LoanMethod || ''}
                onChange={e => setForm(f => ({ ...f, LoanMethod: e.target.value, LoanPurposeType: '' }))}
                className={`w-full rounded-md p-2.5 text-sm ${inputStyle}`}>
                {LOAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Tổng mức cấp (HĐTD) *</label>
              <input type="text" value={formAmount}
                onChange={e => setFormAmount(formatMoneyInput(e.target.value))}
                placeholder="4.000.000.000"
                className={`w-full rounded-md p-2.5 text-sm font-mono font-bold text-accent ${inputStyle}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Ngày HĐ có hiệu lực</label>
              <DateInput value={form.ContractStartDate || ''}
                onChange={v => setForm(f => ({ ...f, ContractStartDate: v }))}
                className={`w-full rounded-md p-2.5 text-sm font-mono ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Thời hạn HĐTD (tháng)</label>
              <input type="number" min={1} value={form.LoanTenorMonths ?? ''}
                onChange={e => setForm(f => ({ ...f, LoanTenorMonths: parseInt(e.target.value, 10) || null }))}
                className={`w-full rounded-md p-2.5 text-sm font-mono ${inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Ngày kết thúc HĐ</label>
              <DateInput readOnly value={form.ContractEndDate || ''}
                onChange={v => setForm(f => ({ ...f, ContractEndDate: v }))}
                className={`w-full rounded-md p-2.5 text-sm font-mono ${inputStyle}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Mục đích vay vốn</label>
              <select value={form.LoanPurposeType || ''}
                onChange={e => setForm(f => ({ ...f, LoanPurposeType: e.target.value }))}
                className={`w-full rounded-md p-2.5 text-sm ${inputStyle}`}>
                <option value="">— Chọn —</option>
                {purposeOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`block mb-1 ${labelStyle}`}>Mô tả chi tiết mục đích</label>
              <input type="text" value={form.LoanPurpose || ''}
                onChange={e => setForm(f => ({ ...f, LoanPurpose: e.target.value }))}
                className={`w-full rounded-md p-2.5 text-sm ${inputStyle}`} />
            </div>
          </div>

          <div className={`rounded-md p-3 border ${'bg-accent-soft border-accent/30'}`}>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={useSharedApproval}
                onChange={e => setUseSharedApproval(e.target.checked)}
                className="w-4 h-4 accent-accent" />
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
                    className={`w-full rounded-md p-2.5 text-sm font-mono ${inputStyle}`} />
                </div>
                <div>
                  <label className={`block mb-1 ${labelStyle}`}>Hạn mức được duyệt</label>
                  <input type="text" value={formApprovalAmount}
                    onChange={e => setFormApprovalAmount(formatMoneyInput(e.target.value))}
                    className={`w-full rounded-md p-2.5 text-sm font-mono ${inputStyle}`} />
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
              <div className="text-xs text-neg flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Chưa có TSBĐ. Thêm ở tab Định Giá TSĐB.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {collaterals.map(col => {
                  const isChecked = selectedCollateralIds.includes(col.Id);
                  const val = collateralValue(col);
                  const ltv = getEffectiveLtv(col);
                  const capacity = usableCapacity(col, today);
                  const tinhTrang = appraisalStatus(col, today);

                  return (
                    <div key={col.Id} className={`p-3 rounded-md border flex flex-wrap items-center justify-between gap-3 ${
                      isChecked
                        ? ('bg-accent-soft border-accent/30')
                        : ('bg-panel border-line hover:border-accent')
                    }`}>
                      <div className="flex items-start space-x-3 flex-1 min-w-[220px]">
                        <input type="checkbox" checked={isChecked}
                          onChange={e => setSelectedCollateralIds(prev =>
                            e.target.checked ? [...prev, col.Id] : prev.filter(x => x !== col.Id))}
                          className="w-4 h-4 rounded text-accent mt-0.5" />
                        <div>
                          <div className="font-bold text-xs">
                            {col.AssetType || 'TSBĐ'} — {col.Address || col.AssetCode}
                          </div>
                          <div className="text-[11px] text-ink-faint mt-0.5 flex flex-wrap items-center gap-3">
                            <span>Định giá: <strong>{fmtMoney(val)}</strong></span>
                            <span>LTV: <strong className="font-mono text-accent">{ltv}%</strong></span>
                            <span>Ngày định giá: <span className="font-mono">{fmtDate(col.AppraisalDate)}</span></span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-ink-faint block uppercase">Khả năng bảo đảm</span>
                        <span className={`text-xs font-mono font-bold ${
                          capacity > 0 ? 'text-pos' : 'text-neg'
                        }`}>
                          {fmtMoney(capacity)}
                        </span>
                        {capacity === 0 && (
                          <span className="block text-[10px] font-semibold text-neg">
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
                  <div className={`p-3 rounded-md border text-xs font-semibold flex flex-wrap items-center justify-between gap-3 ${
                    'bg-pos-soft border-pos/30 text-pos'
                  }`}>
                    <span>TỔNG KHẢ NĂNG BẢO ĐẢM ({selectedCollateralIds.length} tài sản)</span>
                    <span className="font-mono">{fmtMoney(tongKhaNangBaoDam)}</span>
                  </div>
                )}

                {vuotKhaNangBaoDam && (
                  <div className={`p-3 rounded-md border text-xs font-bold ${
                    'bg-neg-soft border-neg/30 text-neg'
                  }`}>
                    Mức cấp {fmtMoney(parseMoneyInput(formAmount))} vượt khả năng bảo đảm {fmtMoney(tongKhaNangBaoDam)}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-line">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={form.IsClosed ?? false}
                disabled={!closeCheck.allowed}
                onChange={e => setForm(f => ({ ...f, IsClosed: e.target.checked }))}
                className="w-4 h-4 accent-accent disabled:opacity-40" />
              <span className={`text-xs font-medium ${closeCheck.allowed ? '' : 'text-ink-faint'}`}>
                HĐTD đã đóng
              </span>
            </label>
            <button type="submit" disabled={loading}
              className="flex items-center space-x-1.5 bg-accent hover:opacity-90 disabled:opacity-50 text-accent-ink font-bold px-5 py-2 rounded-md text-xs">
              <Save className="w-3.5 h-3.5" /><span>{editing ? 'Cập nhật' : 'Tạo HĐTD'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
