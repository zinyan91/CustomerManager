import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Coins,
  FileSpreadsheet,
  Plus,
  Trash2,
  X,
  Download,
} from 'lucide-react';
import { fmtMoney, fmtDate, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { DateInput } from '../DateInput';
import { CustomerPicker } from '../ui/CustomerPicker';
import { fetchCustomersAPI } from '../../lib/api';
import type { Customer } from '../../types';
import { exportBm12ToExcel } from '../../lib/bm12Export';
import {
  calcStkPledge,
  TENOR_UNIT_LABELS,
  PLEDGE_DEPOSIT_TYPE_LABELS,
  INTEREST_PAYMENT_METHOD_LABELS,
} from '../../lib/stkPledge';
import type {
  TenorUnit,
  PledgeDepositType,
  DepositInterestPaymentMethod,
} from '../../lib/stkPledge';
import type { UiClasses } from '../../lib/uiClasses';

interface Tool2StkSingleCalcProps {
  styles: UiClasses;
}

interface LoanItemState {
  id: string;
  name: string;
  loanAmountStr: string;
  loanRateStr: string;
  disbursementDate: string;
  loanDueDate: string;
  useOwnDue: boolean;
}

export const Tool2StkSingleCalc: React.FC<Tool2StkSingleCalcProps> = ({ styles }) => {
  // Classification
  const [depositType, setDepositType] = useState<PledgeDepositType>('tg_vnd');
  const [interestPaymentMethod, setInterestPaymentMethod] = useState<DepositInterestPaymentMethod>('end_term');

  // Currency & Exchange Rate
  const [currency, setCurrency] = useState('USD');
  const [exchangeRateStr, setExchangeRateStr] = useState('25.450');

  // Deposit inputs
  const [savingsAmountStr, setSavingsAmountStr] = useState('500.000.000');
  const [depositDate, setDepositDate] = useState('2026-05-20');
  const [tenorStr, setTenorStr] = useState('6');
  const [tenorUnit, setTenorUnit] = useState<TenorUnit>('thang');
  const [savingsRateStr, setSavingsRateStr] = useState('6.5');
  const [nonTermRateStr, setNonTermRateStr] = useState('0.2');
  const [paidInterestStr, setPaidInterestStr] = useState('0');
  const [clawbackAmountStr, setClawbackAmountStr] = useState('0');
  const [customLtvStr, setCustomLtvStr] = useState('100');

  // Multi-loans list state
  const [loans, setLoans] = useState<LoanItemState[]>([
    {
      id: 'loan-1',
      name: 'Khoản vay 1',
      loanAmountStr: '450.000.000',
      loanRateStr: '9.0',
      disbursementDate: '2026-05-20',
      loanDueDate: '2026-11-20',
      useOwnDue: false,
    },
  ]);

  // BM12 Excel Export State
  const [showBm12Modal, setShowBm12Modal] = useState(false);
  const [bm12CustomerName, setBm12CustomerName] = useState('');
  const [bm12Cif, setBm12Cif] = useState('');
  const [bm12Tkv, setBm12Tkv] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  useEffect(() => {
    fetchCustomersAPI().then(setCustomers).catch(() => {});
  }, []);

  const handleSelectCustomer = (id: number | null) => {
    setSelectedCustomerId(id);
    if (id !== null) {
      const c = customers.find(item => item.Id === id);
      if (c) {
        setBm12CustomerName(c.FullName);
        setBm12Cif(c.CifKh || '');
        setBm12Tkv(c.AccountNumber || '');
      }
    }
  };

  const handleExportBm12 = () => {
    exportBm12ToExcel({
      customerName: bm12CustomerName,
      cif: bm12Cif,
      tkv: bm12Tkv,
      loans: loans.map((l, idx) => {
        const itemRes = result.loanItems[idx];
        return {
          stt: idx + 1,
          customerName: bm12CustomerName,
          cif: bm12Cif,
          tkv: bm12Tkv,
          fromDate: l.disbursementDate,
          toDate: l.useOwnDue ? l.loanDueDate : (result.savingsDueDate || l.disbursementDate),
          days: itemRes?.loanDays,
          balance: parseMoneyInput(l.loanAmountStr),
          interestRateAnnual: (parseFloat(l.loanRateStr) || 0) / 100,
          interest: itemRes?.loanInterest,
          penalty: 0,
        };
      }),
    });
    setShowBm12Modal(false);
  };

  // Update default LTV and amounts when deposit type changes
  useEffect(() => {
    if (depositType === 'tg_foreign') {
      setCustomLtvStr('90');
      if (savingsAmountStr === '500.000.000') {
        setSavingsAmountStr('20.000');
      }
    } else {
      setCustomLtvStr('100');
      if (savingsAmountStr === '20.000') {
        setSavingsAmountStr('500.000.000');
      }
    }
  }, [depositType]);

  const rawSavingsAmount = parseMoneyInput(savingsAmountStr);
  const exchangeRate = depositType === 'tg_foreign'
    ? parseFloat(exchangeRateStr.replace(/\./g, '').replace(',', '.')) || 25450
    : 1;
  const paidInterest = parseMoneyInput(paidInterestStr);
  const clawbackAmount = parseMoneyInput(clawbackAmountStr);
  const customLtv = parseFloat(customLtvStr) || (depositType === 'tg_foreign' ? 90 : 100);

  const parsedLoans = useMemo(() => {
    return loans.map(l => ({
      id: l.id,
      name: l.name,
      loanAmount: parseMoneyInput(l.loanAmountStr),
      loanRateAnnual: (parseFloat(l.loanRateStr) || 0) / 100,
      disbursementDate: l.disbursementDate,
      loanDueDate: l.useOwnDue ? l.loanDueDate : undefined,
    }));
  }, [loans]);

  const result = useMemo(() => calcStkPledge({
    depositType,
    interestPaymentMethod,
    currency,
    exchangeRate,
    savingsAmount: rawSavingsAmount,
    depositDate,
    tenor: parseInt(tenorStr, 10) || 0,
    tenorUnit,
    savingsRateAnnual: (parseFloat(savingsRateStr) || 0) / 100,
    nonTermRateAnnual: (parseFloat(nonTermRateStr) || 0) / 100,
    paidInterest,
    clawbackAmount,
    customLtvPercent: customLtv,
    loans: parsedLoans,
  }), [
    depositType,
    interestPaymentMethod,
    currency,
    exchangeRate,
    rawSavingsAmount,
    depositDate,
    tenorStr,
    tenorUnit,
    savingsRateStr,
    nonTermRateStr,
    paidInterest,
    clawbackAmount,
    customLtv,
    parsedLoans,
  ]);

  const handleAddLoan = () => {
    const nextIdx = loans.length + 1;
    setLoans(prev => [
      ...prev,
      {
        id: `loan-${Date.now()}`,
        name: `Khoản vay ${nextIdx}`,
        loanAmountStr: '0',
        loanRateStr: '9.0',
        disbursementDate: depositDate,
        loanDueDate: result.savingsDueDate || depositDate,
        useOwnDue: false,
      },
    ]);
  };

  const handleRemoveLoan = (id: string) => {
    if (loans.length <= 1) return;
    setLoans(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLoan = (id: string, updates: Partial<LoanItemState>) => {
    setLoans(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
  };

  const handleAutoMaxLoan = () => {
    if (result.maxAllowableLoan > 0) {
      if (loans.length === 1) {
        handleUpdateLoan(loans[0].id, {
          loanAmountStr: formatMoneyInput(result.maxAllowableLoan.toString()),
        });
      } else {
        // Điền số tiền còn lại vào khoản cuối cùng
        const otherLoansSum = loans.slice(0, -1).reduce((sum, l) => sum + parseMoneyInput(l.loanAmountStr), 0);
        const remain = Math.max(0, result.maxPrincipalCap - otherLoansSum);
        handleUpdateLoan(loans[loans.length - 1].id, {
          loanAmountStr: formatMoneyInput(remain.toString()),
        });
      }
    }
  };

  const labelCls = `block mb-1 text-[11px] font-semibold text-ink-muted ${styles.labelStyle}`;
  const inputCls = `w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs ${styles.inputStyle}`;

  return (
    <div className="space-y-4">
      <div className={`${styles.containerCardBg} rounded-2xl p-5 sm:p-6 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-5 text-xs animate-in fade-in duration-150`}>
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent-soft text-accent shrink-0 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-accent uppercase tracking-wider text-xs sm:text-sm flex items-center gap-2">
                <span>TÍNH CẦM CỐ TIỀN GỬI & CHỨNG CHỈ TIỀN GỬI</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAutoMaxLoan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-accent-ink hover:opacity-90 font-bold shadow-xs text-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Vay tối đa theo quy định</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBm12Modal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pos text-pos-ink hover:opacity-90 font-bold shadow-xs text-xs transition-all cursor-pointer"
              title="Xuất Bảng tính thu nợ khoản vay CCSTK (.xlsx) chuẩn BM12"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel BM12</span>
            </button>
          </div>
        </div>

        {/* Segmented Selectors: Collateral Type & Payment Method */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {/* Collateral Type */}
          <div className="pl-4 border-l-2 border-accent/40 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-accent" />
              <span>LOẠI TÀI SẢN BẢO ĐẢM</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(PLEDGE_DEPOSIT_TYPE_LABELS) as PledgeDepositType[]).map(type => {
                const isSelected = depositType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDepositType(type)}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-bold text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent text-accent-ink shadow-2xs ring-1 ring-accent'
                        : 'bg-surface/80 border border-line/70 text-ink-muted hover:text-ink hover:bg-surface-elevated'
                    }`}
                  >
                    {PLEDGE_DEPOSIT_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interest Payment Method */}
          <div className="pl-4 border-l-2 border-warn/40 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-warn" />
              <span>PHƯƠNG THỨC LÃNH LÃI TIỀN GỬI / CCTG</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(INTEREST_PAYMENT_METHOD_LABELS) as DepositInterestPaymentMethod[]).map(method => {
                const isSelected = interestPaymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setInterestPaymentMethod(method)}
                    className={`px-2.5 py-2 rounded-xl text-[11px] font-bold text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-warn text-warn-ink shadow-2xs ring-1 ring-warn'
                        : 'bg-surface/80 border border-line/70 text-ink-muted hover:text-ink hover:bg-surface-elevated'
                    }`}
                  >
                    {INTEREST_PAYMENT_METHOD_LABELS[method]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2 Ô KPI Nổi bật: TỔNG GỐC LÃI SỔ NHẬN & TỔNG TRẢ NỢ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ô 1: Tổng gốc lãi sổ nhận */}
          <div className="p-4 sm:p-5 rounded-2xl bg-warn-soft/30 border border-warn/40 specular-card shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-warn uppercase tracking-wider block">
                TỔNG GỐC LÃI SỔ NHẬN
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-warn">
                {fmtMoney(result.savingsNetReceived)}
              </div>
            </div>
            <div className="text-right text-[11px] font-mono text-ink-muted space-y-0.5">
              <div>Gốc: <strong className="text-ink">{fmtMoney(result.savingsPrincipalVnd)}</strong></div>
              <div>Lãi gửi: <strong className="text-pos">+{fmtMoney(result.savingsInterest)}</strong></div>
            </div>
          </div>

          {/* Ô 2: Tổng trả nợ */}
          <div className="p-4 sm:p-5 rounded-2xl bg-accent-soft/30 border border-accent/40 specular-card shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider block">
                TỔNG TRẢ NỢ (GỐC + LÃI VAY)
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono text-accent">
                {fmtMoney(result.totalRepayment)}
              </div>
            </div>
            <div className="text-right text-[11px] font-mono text-ink-muted space-y-0.5">
              <div>Gốc vay: <strong className="text-ink">{fmtMoney(result.loanAmount)}</strong></div>
              <div>Lãi vay: <strong className="text-accent">+{fmtMoney(result.loanInterest)}</strong></div>
            </div>
          </div>
        </div>

        {/* Input Grid: Thông tin Tiền gửi & Danh sách Khoản vay */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Box 1: Thông tin Tiền gửi / CCTG */}
          <div className="pl-4 border-l-2 border-warn/40 space-y-3.5">
            <div className="font-bold text-warn text-xs uppercase tracking-wider flex items-center justify-between border-b border-line/50 pb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warn" />
                <span>THÔNG TIN TIỀN GỬI / SỔ TIẾT KIỆM / CCTG</span>
              </div>
              <span className="text-[10px] font-mono text-ink-faint">
                {PLEDGE_DEPOSIT_TYPE_LABELS[depositType]}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Số tiền gốc */}
              <div>
                <label className={labelCls}>
                  Số tiền gốc {depositType === 'tg_foreign' ? `(${currency})` : '(VNĐ)'}
                </label>
                <input
                  type="text"
                  value={savingsAmountStr}
                  onChange={e => setSavingsAmountStr(formatMoneyInput(e.target.value))}
                  className={`${inputCls} font-mono font-bold text-warn`}
                />
              </div>

              {/* Tỷ giá quy đổi nếu là Ngoại tệ */}
              {depositType === 'tg_foreign' ? (
                <div>
                  <label className={labelCls}>Tỷ giá quy đổi (VNĐ / {currency})</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      type="text"
                      value={currency}
                      onChange={e => setCurrency(e.target.value.toUpperCase())}
                      className={`${inputCls} font-mono font-bold col-span-1 text-center`}
                      placeholder="USD"
                    />
                    <input
                      type="text"
                      value={exchangeRateStr}
                      onChange={e => setExchangeRateStr(e.target.value)}
                      className={`${inputCls} font-mono font-bold col-span-2`}
                      placeholder="25.450"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Gốc quy đổi tương đương (VNĐ)</label>
                  <div className={`${inputCls} font-mono font-bold text-warn flex items-center bg-panel-muted/50`}>
                    {fmtMoney(result.savingsPrincipalVnd)}
                  </div>
                </div>
              )}

              {/* Ngày gửi sổ */}
              <div>
                <label className={labelCls}>Ngày gửi tiền / Phát hành</label>
                <DateInput
                  value={depositDate}
                  onChange={setDepositDate}
                  className={inputCls}
                />
              </div>

              {/* Lãi suất sổ */}
              <div>
                <label className={labelCls}>Lãi suất tiền gửi (%/năm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={savingsRateStr}
                  onChange={e => setSavingsRateStr(e.target.value)}
                  className={`${inputCls} font-mono font-bold text-warn`}
                />
              </div>

              {/* Kỳ hạn */}
              <div>
                <label className={labelCls}>Kỳ hạn gửi</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={tenorStr}
                    onChange={e => setTenorStr(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                  <select
                    value={tenorUnit}
                    onChange={e => setTenorUnit(e.target.value as TenorUnit)}
                    className={`${inputCls} font-bold`}
                  >
                    {(Object.keys(TENOR_UNIT_LABELS) as TenorUnit[]).map(u => (
                      <option key={u} value={u}>{TENOR_UNIT_LABELS[u]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ngày đáo hạn sổ */}
              <div>
                <label className={labelCls}>Ngày đáo hạn sổ</label>
                <div className={`${inputCls} font-mono font-bold text-warn flex items-center justify-between`}>
                  <span>{result.savingsDueDate ? fmtDate(result.savingsDueDate) : '—'}</span>
                  {result.savingsDays > 0 && (
                    <span className="text-[10px] text-ink-muted">({result.savingsDays} ngày)</span>
                  )}
                </div>
              </div>

              {/* Lãi suất không kỳ hạn */}
              <div>
                <label className={labelCls}>Lãi suất không kỳ hạn (%/năm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={nonTermRateStr}
                  onChange={e => setNonTermRateStr(e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>

              {/* Lãi Ngân hàng đã chi trả */}
              {interestPaymentMethod !== 'end_term' ? (
                <div>
                  <label className={labelCls}>Lãi tiền gửi đã chi cho KH (VNĐ)</label>
                  <input
                    type="text"
                    value={paidInterestStr}
                    onChange={e => setPaidInterestStr(formatMoneyInput(e.target.value))}
                    className={`${inputCls} font-mono font-bold text-neg`}
                  />
                </div>
              ) : (
                <div>
                  <label className={labelCls}>Khoản ưu đãi / KM phải thu hồi (VNĐ)</label>
                  <input
                    type="text"
                    value={clawbackAmountStr}
                    onChange={e => setClawbackAmountStr(formatMoneyInput(e.target.value))}
                    className={`${inputCls} font-mono font-bold text-neg`}
                  />
                </div>
              )}

              {/* Khoản thu hồi thêm khi trả định kỳ/trước */}
              {interestPaymentMethod !== 'end_term' && (
                <div>
                  <label className={labelCls}>Khoản ưu đãi / KM phải thu hồi (VNĐ)</label>
                  <input
                    type="text"
                    value={clawbackAmountStr}
                    onChange={e => setClawbackAmountStr(formatMoneyInput(e.target.value))}
                    className={`${inputCls} font-mono font-bold text-neg`}
                  />
                </div>
              )}

              {/* Tỷ lệ LTV */}
              <div>
                <label className={labelCls}>Tỷ lệ cấp tín dụng LTV (%)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  value={customLtvStr}
                  onChange={e => setCustomLtvStr(e.target.value)}
                  className={`${inputCls} font-mono font-bold`}
                />
              </div>
            </div>
          </div>

          {/* Box 2: Danh sách các Khoản Vay Cầm Cố */}
          <div className="pl-4 border-l-2 border-accent/40 space-y-3.5">
            <div className="font-bold text-accent text-xs uppercase tracking-wider flex items-center justify-between border-b border-line/50 pb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent" />
                <span>KHOẢN VAY CẦM CỐ ({loans.length} KHOẢN)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-ink-muted">
                  Hạn mức gốc tối đa: <strong className="text-ink font-bold">{fmtMoney(result.maxPrincipalCap)}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleAddLoan}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent text-accent-ink hover:opacity-90 font-bold text-[11px] transition-all cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm khoản vay</span>
                </button>
              </div>
            </div>

            {/* List of Loans */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {loans.map((loan, idx) => {
                const itemResult = result.loanItems[idx];
                return (
                  <div key={loan.id} className="pb-3 border-b border-accent/15 last:border-b-0 last:pb-0 space-y-2.5 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-accent-soft text-accent font-bold font-mono text-[10px]">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={loan.name}
                          onChange={e => handleUpdateLoan(loan.id, { name: e.target.value })}
                          className="font-bold text-xs bg-transparent border-b border-transparent focus:border-accent text-ink focus:outline-none px-1"
                        />
                      </div>
                      {loans.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLoan(loan.id)}
                          className="text-ink-faint hover:text-neg p-1 transition-colors cursor-pointer"
                          title="Xóa khoản vay"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className={labelCls}>Số tiền vay (VNĐ)</label>
                        <input
                          type="text"
                          value={loan.loanAmountStr}
                          onChange={e => handleUpdateLoan(loan.id, { loanAmountStr: formatMoneyInput(e.target.value) })}
                          className={`${inputCls} font-mono font-bold text-accent`}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Lãi suất vay (%/năm)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={loan.loanRateStr}
                          onChange={e => handleUpdateLoan(loan.id, { loanRateStr: e.target.value })}
                          className={`${inputCls} font-mono font-bold text-accent`}
                        />
                      </div>

                      <div>
                        <label className={labelCls}>Ngày giải ngân</label>
                        <DateInput
                          value={loan.disbursementDate}
                          onChange={v => handleUpdateLoan(loan.id, { disbursementDate: v })}
                          className={inputCls}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-ink-muted">Ngày đáo hạn vay</label>
                          <label className="flex items-center space-x-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={loan.useOwnDue}
                              onChange={e => handleUpdateLoan(loan.id, { useOwnDue: e.target.checked })}
                              className="rounded border-line text-accent focus:ring-accent w-3 h-3"
                            />
                            <span className="text-[9px] text-ink-faint">Tự chọn</span>
                          </label>
                        </div>
                        {loan.useOwnDue ? (
                          <DateInput
                            value={loan.loanDueDate}
                            onChange={v => handleUpdateLoan(loan.id, { loanDueDate: v })}
                            className={inputCls}
                          />
                        ) : (
                          <div className={`${inputCls} font-mono text-[11px] flex items-center justify-between bg-panel-muted/40`}>
                            <span>{result.savingsDueDate ? fmtDate(result.savingsDueDate) : '—'}</span>
                            <span className="text-[10px] text-ink-faint">(khớp sổ)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {itemResult && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-line/40 text-[11px] font-mono">
                        <span className="text-ink-muted">
                          Thời gian vay: <strong>{itemResult.loanDays} ngày</strong>
                        </span>
                        <span className="text-ink-muted">
                          Lãi vay: <strong className="text-accent">{fmtMoney(itemResult.loanInterest)}</strong>
                        </span>
                        <span className="text-ink-muted">
                          Tổng trả: <strong className="text-ink">{fmtMoney(itemResult.totalObligation)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chênh lệch Net Banner */}
        <div className={`p-4 sm:p-5 rounded-2xl border specular-card shadow-xs ${
          result.netGain >= 0
            ? 'bg-pos-soft/30 border-pos/30 text-pos'
            : 'bg-neg-soft/30 border-neg/30 text-neg'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className={`p-2 rounded-xl shrink-0 ${result.netGain >= 0 ? 'bg-pos-soft text-pos' : 'bg-neg-soft text-neg'}`}>
                {result.netGain >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-bold tracking-wider uppercase">
                  {result.netGain >= 0 ? 'CHÊNH LỆCH — LỢI NHUẬN RÒNG' : 'CHÊNH LỆCH — CHI PHÍ THIỆT HẠI LÃI'}
                </div>
              </div>
            </div>
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight">
              {fmtMoney(result.netGain)}
            </span>
          </div>
        </div>

      </div>

      {/* Modal Xuất Excel BM12 */}
      {showBm12Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-panel border border-line rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-pos-soft text-pos">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-ink">Xuất Excel BM12 (Bảng tính thu nợ CCSTK)</h3>
                  <p className="text-[11px] text-ink-muted">Chuẩn hóa theo Thông báo số 2097/2026/TB-TGĐ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBm12Modal(false)}
                className="text-ink-faint hover:text-ink p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelCls}>Chọn nhanh từ Danh sách Khách hàng (Tùy chọn)</label>
                <CustomerPicker
                  customers={customers}
                  selectedCustomerId={selectedCustomerId}
                  onSelectCustomer={handleSelectCustomer}
                  placeholder="— Tìm theo tên, CIF để tự động điền —"
                />
              </div>

              <div>
                <label className={labelCls}>Tên khách hàng</label>
                <input
                  type="text"
                  placeholder="VD: NGUYỄN VĂN ANH"
                  value={bm12CustomerName}
                  onChange={e => setBm12CustomerName(e.target.value)}
                  className={`${inputCls} uppercase`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Mã khách hàng (CIF)</label>
                  <input
                    type="text"
                    placeholder="VD: 005123456"
                    value={bm12Cif}
                    onChange={e => setBm12Cif(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
                <div>
                  <label className={labelCls}>Số tài khoản vay (TKV)</label>
                  <input
                    type="text"
                    placeholder="VD: 000000345678"
                    value={bm12Tkv}
                    onChange={e => setBm12Tkv(e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface/80 border border-line/70 text-[11px] space-y-1">
                <div className="flex justify-between text-ink-muted">
                  <span>Số khoản vay / kỳ thu nợ:</span>
                  <span className="font-bold text-ink">{loans.length} khoản</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Tổng dư nợ:</span>
                  <span className="font-bold text-accent">{fmtMoney(result.totalLoansPrincipal)}</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Tổng tiền lãi dự thu:</span>
                  <span className="font-bold text-accent">{fmtMoney(result.totalLoansInterest)}</span>
                </div>
                <div className="flex justify-between text-ink-muted border-t border-line/40 pt-1">
                  <span>Tổng gốc + lãi:</span>
                  <span className="font-bold text-pos">{fmtMoney(result.totalLoansObligation)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line/60">
              <button
                type="button"
                onClick={() => setShowBm12Modal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExportBm12}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-pos text-pos-ink hover:opacity-90 font-bold text-xs transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải tệp Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
