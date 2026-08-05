import React, { useEffect, useMemo, useState } from 'react';
import {
  Percent, TrendingDown, PiggyBank, Loader2, AlertTriangle, ShieldAlert,
  FileText, Landmark, Save, RefreshCw, Printer, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fmtMoney, fmtDate, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import {
  fetchRateProgramsAPI, fetchRateProgramTiersAPI, fetchRateProgramPrepaymentFeesAPI,
  fetchRateProgramFbeCodesAPI, fetchDepositRateAuthoritiesAPI, updateRateProgramTierAPI,
  fetchRateProgramFeeOptionsAPI, fetchRateProgramConditionsAPI,
} from '../../lib/api';
import {
  findActiveProgram, resolvePostFixedRate, calcServiceFee, calcDepositInterest,
  collectQuoteWarnings, hasBlockingWarning,
  PAYOUT_MODE_LABELS, CHANNEL_LABELS, KIND_LABELS, FBE_SCOPE_LABELS,
  buildDepositRateRows, depositChannelsPresent,
} from '../../lib/rateQuote';
import vietbankLogo from '../../assets/vietbank-logo.png?inline';
import { buildRateSheetHtml, findRateSheetBlockers } from '../../lib/rateSheet';
import type {
  RateProgram, RateProgramTier, RateProgramPrepaymentFee,
  RateProgramFbeCode, DepositRateAuthority, RateProgramKind,
  RateProgramFeeOption, RateProgramCondition,
} from '../../lib/rateQuote';

const pct = (v?: number | null) =>
  v === null || v === undefined || isNaN(v) ? '—' : `${(v * 100).toFixed(2)}%`;

const todayIso = () => new Date().toISOString().split('T')[0];

export const RateQuoteView: React.FC = () => {
  const { theme } = useTheme();
  const { isAdmin } = useAuth();
  const isLight = theme === 'light';

  const [kind, setKind] = useState<RateProgramKind>('cho_vay_ngan_han');
  const [onDate, setOnDate] = useState(todayIso);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [programs, setPrograms] = useState<RateProgram[]>([]);
  const [tiers, setTiers] = useState<RateProgramTier[]>([]);
  const [prepayFees, setPrepayFees] = useState<RateProgramPrepaymentFee[]>([]);
  const [fbeCodes, setFbeCodes] = useState<RateProgramFbeCode[]>([]);
  const [authorities, setAuthorities] = useState<DepositRateAuthority[]>([]);
  const [feeOptions, setFeeOptions] = useState<RateProgramFeeOption[]>([]);
  const [conditions, setConditions] = useState<RateProgramCondition[]>([]);
  const [preparedBy, setPreparedBy] = useState('');

  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [amountStr, setAmountStr] = useState('1.000.000.000');
  const [tenorStr, setTenorStr] = useState('6');
  const [baseRateStr, setBaseRateStr] = useState('7.50');
  const [casaStr, setCasaStr] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [depositDaysStr, setDepositDaysStr] = useState('180');

  const [showFeeTable, setShowFeeTable] = useState(false);
  const [includeFeeInSheet, setIncludeFeeInSheet] = useState(true);

  const [editRateStr, setEditRateStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const progs = await fetchRateProgramsAPI();
      setPrograms(progs);
      const ids = progs.map(p => p.Id);
      const [t, f, c, a, o, k] = await Promise.all([
        fetchRateProgramTiersAPI(ids),
        fetchRateProgramPrepaymentFeesAPI(ids),
        fetchRateProgramFbeCodesAPI(ids),
        fetchDepositRateAuthoritiesAPI(ids),
        fetchRateProgramFeeOptionsAPI(ids),
        fetchRateProgramConditionsAPI(ids),
      ]);
      setTiers(t);
      setPrepayFees(f);
      setFbeCodes(c);
      setAuthorities(a);
      setFeeOptions(o);
      setConditions(k);
    } catch (err: any) {
      setLoadError(err?.message || 'Không tải được chương trình lãi suất.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const program = useMemo(() => findActiveProgram(programs, kind, onDate), [programs, kind, onDate]);

  const programTiers = useMemo(
    () => (program ? tiers.filter(t => t.ProgramId === program.Id) : []),
    [tiers, program]
  );

  const lendingTiers = programTiers;
  const depositChannels = useMemo(() => depositChannelsPresent(programTiers), [programTiers]);
  const depositRows = useMemo(() => buildDepositRateRows(programTiers), [programTiers]);

  const programPrepayFees = useMemo(
    () => (program ? prepayFees.filter(f => f.ProgramId === program.Id) : []),
    [prepayFees, program]
  );
  const programFbeCodes = useMemo(
    () => (program ? fbeCodes.filter(c => c.ProgramId === program.Id) : []),
    [fbeCodes, program]
  );
  const programAuthorities = useMemo(
    () => (program ? authorities.filter(a => a.ProgramId === program.Id) : []),
    [authorities, program]
  );
  const programFeeOptions = useMemo(
    () => (program ? feeOptions.filter(o => o.ProgramId === program.Id) : []),
    [feeOptions, program]
  );
  const programConditions = useMemo(
    () => (program ? conditions.filter(c => c.ProgramId === program.Id) : []),
    [conditions, program]
  );

  const sheetInput = useMemo(() => (program ? {
    program,
    tiers: programTiers,
    prepaymentFees: programPrepayFees,
    feeOptions: programFeeOptions,
    conditions: programConditions,
    preparedBy: preparedBy.trim() || undefined,
    logoDataUri: vietbankLogo,
    channel: null,
    includeFeeOptions: includeFeeInSheet,
  } : null), [program, programTiers, programPrepayFees, programFeeOptions, programConditions,
    preparedBy, includeFeeInSheet, kind]);

  const sheetBlockers = useMemo(
    () => (sheetInput ? findRateSheetBlockers(sheetInput) : []),
    [sheetInput]
  );

  const handleExportSheet = () => {
    if (!sheetInput || sheetBlockers.length > 0) return;
    const html = buildRateSheetHtml(sheetInput);
    const win = window.open('', '_blank');
    if (!win) {
      setSaveMsg('Trình duyệt đã chặn cửa sổ mới. Cho phép pop-up rồi thử lại.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.setTimeout(() => win.print(), 300);
  };

  useEffect(() => {
    const pool = kind === 'huy_dong' ? programTiers : lendingTiers;
    if (pool.length === 0) { setSelectedTierId(null); return; }
    if (!pool.some(t => t.Id === selectedTierId)) setSelectedTierId(pool[0].Id);
  }, [kind, programTiers, lendingTiers, selectedTierId]);

  const selectedTier = useMemo(
    () => programTiers.find(t => t.Id === selectedTierId) ?? null,
    [programTiers, selectedTierId]
  );

  useEffect(() => {
    setEditRateStr(
      selectedTier && selectedTier.RateAnnual !== null && selectedTier.RateAnnual !== undefined
        ? (selectedTier.RateAnnual * 100).toFixed(2)
        : ''
    );
    setSaveMsg('');
  }, [selectedTier]);

  const amount = parseMoneyInput(amountStr);
  const tenorMonths = parseInt(tenorStr, 10) || 0;
  const baseRate = baseRateStr.trim() === '' ? null : (parseFloat(baseRateStr) || 0) / 100;
  const casaAverage = casaStr.trim() === '' ? null : parseMoneyInput(casaStr);
  const depositDays = parseInt(depositDaysStr, 10) || 0;

  const warnings = useMemo(
    () => collectQuoteWarnings({ program, tier: selectedTier, onDate, loanTenorMonths: tenorMonths }),
    [program, selectedTier, onDate, tenorMonths]
  );
  const blocked = hasBlockingWarning(warnings);

  const postFixedRate = useMemo(
    () => resolvePostFixedRate(baseRate, program?.FloatingSpreadAnnual),
    [baseRate, program]
  );

  const fee = useMemo(() => calcServiceFee({
    disbursementAmount: amount,
    feeRatio: selectedTier?.MinFeeRatio,
    minFeeAmountVnd: program?.MinFeeAmountVnd,
    casaAverage,
    casaMinRatio: program?.CasaMinRatio,
    casaShortfallAddon: program?.CasaShortfallFeeAddon,
    newCustomerDiscount: isNewCustomer ? program?.NewCustomerFeeDiscount : 0,
  }), [amount, selectedTier, program, casaAverage, isNewCustomer]);

  const depositInterest = useMemo(
    () => calcDepositInterest(amount, selectedTier?.RateAnnual, depositDays),
    [amount, selectedTier, depositDays]
  );

  const handleSaveRate = async () => {
    if (!selectedTier) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const trimmed = editRateStr.trim();
      const parsed = trimmed === '' ? null : parseFloat(trimmed);
      if (trimmed !== '' && (parsed === null || isNaN(parsed))) {
        throw new Error('Lãi suất không hợp lệ.');
      }
      if (parsed !== null && (parsed < 0 || parsed > 100)) {
        throw new Error('Lãi suất phải trong khoảng 0 – 100 %/năm.');
      }
      const updated = await updateRateProgramTierAPI(selectedTier.Id, {
        RateAnnual: parsed === null ? null : parsed / 100,
      });
      setTiers(prev => prev.map(t => (t.Id === updated.Id ? { ...t, ...updated } : t)));
      setSaveMsg('Đã lưu.');
    } catch (err: any) {
      setSaveMsg(err?.message || 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const cardBg = isLight
    ? 'bg-white border-slate-200 text-slate-800'
    : 'bg-slate-900 border-slate-800 text-slate-100';
  const inputCls = `w-full p-2 rounded-xl border text-xs font-mono bg-transparent ${
    isLight ? 'border-slate-200' : 'border-slate-800'
  }`;
  const labelCls = 'block text-[11px] font-bold text-slate-500 mb-1';

  const kindTabs: { id: RateProgramKind; icon: React.ElementType }[] = [
    { id: 'cho_vay_ngan_han', icon: Percent },
    { id: 'cho_vay_trung_dai_han', icon: TrendingDown },
    { id: 'huy_dong', icon: PiggyBank },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      <div className={`${cardBg} rounded-2xl p-2 border flex flex-wrap items-center gap-2`}>
        {kindTabs.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              kind === id
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{KIND_LABELS[id]}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-1">
          <label className="text-[11px] font-bold text-slate-500">Áp dụng ngày</label>
          <input
            type="date"
            value={onDate}
            onChange={e => setOnDate(e.target.value)}
            className={`${inputCls} w-auto`}
          />
          <button
            type="button"
            onClick={loadAll}
            title="Tải lại"
            className="p-2 rounded-xl text-slate-400 hover:text-sky-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
          {loadError}
        </div>
      )}

      {!program && !loadError && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs font-bold text-amber-800 dark:text-amber-300">
          Không có chương trình {KIND_LABELS[kind].toLowerCase()} nào hiệu lực tại ngày {fmtDate(onDate)}.
          Admin cần nhập chương trình cho kỳ này trước khi chào lãi suất.
        </div>
      )}

      {program && (
        <>
          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-2`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-sky-500" />
                  <h2 className="text-sm font-bold text-sky-600 dark:text-sky-400">{program.Name}</h2>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  {program.DocumentNumber}
                  {program.DocumentDate ? ` • ngày ${fmtDate(program.DocumentDate)}` : ''}
                  {' • hiệu lực '}
                  {fmtDate(program.EffectiveFrom)} → {program.EffectiveTo ? fmtDate(program.EffectiveTo) : 'không thời hạn'}
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1">
                {program.SourceVerified ? (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    ĐÃ ĐỐI CHIẾU VĂN BẢN GỐC
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    ⚠ CHƯA ĐỐI CHIẾU VĂN BẢN GỐC
                  </span>
                )}
                {program.QuotaVnd !== null && program.QuotaVnd !== undefined && (
                  <span className="text-[11px] text-slate-500">
                    Hạn mức chương trình: <strong>{fmtMoney(program.QuotaVnd)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {(program.ScopeText || program.TargetText) && (
            <div className={`${cardBg} rounded-2xl p-4 border grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]`}>
              {program.TargetText && (
                <div>
                  <div className="font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                    Đối tượng áp dụng
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">{program.TargetText}</div>
                </div>
              )}
              {program.ScopeText && (
                <div>
                  <div className="font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-1">
                    Phạm vi áp dụng
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">{program.ScopeText}</div>
                </div>
              )}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border p-3 text-xs font-bold flex items-start space-x-2 ${
                    w.level === 'block'
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                      : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {w.level === 'block'
                    ? <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}


          <div className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {kind === 'huy_dong' ? 'BẢNG LÃI SUẤT TIỀN GỬI' : 'BẢNG LÃI SUẤT CHO VAY'}
            </div>
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 w-8" />
                    {kind === 'huy_dong' ? (
                      <>
                        <th className="p-2.5">BẬC SỐ DƯ / ĐIỀU KIỆN</th>
                        <th className="p-2.5 text-center">KỲ HẠN</th>
                        <th className="p-2.5">CÁCH TRẢ LÃI</th>
                        {depositChannels.map(ch => (
                          <th key={ch} className="p-2.5 text-right whitespace-nowrap">
                            {CHANNEL_LABELS[ch].toUpperCase()} (%/NĂM)
                          </th>
                        ))}
                      </>
                    ) : (
                      <>
                        <th className="p-2.5 text-center">LỰA CHỌN</th>
                        <th className="p-2.5">GÓI CỐ ĐỊNH</th>
                        <th className="p-2.5 text-center">TG VAY TỐI THIỂU</th>
                        <th className="p-2.5 text-right">LSCV (%/NĂM)</th>
                        <th className="p-2.5 text-right">PHÍ TỐI THIỂU</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {kind === 'huy_dong' && depositRows.map(row => {
                    const firstId = depositChannels
                      .map(ch => row.tierIdByChannel[ch])
                      .find(x => x !== undefined) ?? 0;
                    const active = firstId === selectedTierId;
                    return (
                      <tr key={row.key}
                        onClick={() => setSelectedTierId(firstId)}
                        className={`cursor-pointer transition-colors ${
                          active ? 'bg-sky-50 dark:bg-sky-950/40 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}>
                        <td className="p-2.5 text-center">
                          <input type="radio" checked={active} onChange={() => setSelectedTierId(firstId)} />
                        </td>
                        <td className="p-2.5">{row.balanceTierLabel || '—'}</td>
                        <td className="p-2.5 text-center font-mono">
                          {row.tenorMonths ? `${row.tenorMonths} tháng` : '—'}
                        </td>
                        <td className="p-2.5">
                          {row.payoutMode ? PAYOUT_MODE_LABELS[row.payoutMode] : '—'}
                        </td>
                        {depositChannels.map(ch => {
                          const coKenh = ch in row.byChannel;
                          const v = row.byChannel[ch];
                          const thieu = !coKenh || v === null || v === undefined;
                          return (
                            <td key={ch} className={`p-2.5 text-right font-mono font-bold ${
                              thieu ? 'text-slate-400 dark:text-slate-500' : 'text-sky-600 dark:text-sky-400'
                            }`}>
                              {thieu ? '—' : pct(v)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {kind !== 'huy_dong' && lendingTiers.map(t => {
                    const active = t.Id === selectedTierId;
                    const missing = t.RateAnnual === null || t.RateAnnual === undefined;
                    return (
                      <tr
                        key={t.Id}
                        onClick={() => setSelectedTierId(t.Id)}
                        className={`cursor-pointer transition-colors ${
                          active
                            ? 'bg-sky-50 dark:bg-sky-950/40 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input type="radio" checked={active} onChange={() => setSelectedTierId(t.Id)} />
                        </td>
                        <>
                            <td className="p-2.5 text-center font-mono font-bold">{t.PackageCode || '—'}</td>
                            <td className="p-2.5">
                              {t.Label}
                              {t.Note && (
                                <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-normal mt-0.5">
                                  ⚠ {t.Note}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-center font-mono">
                              {t.MinTenorMonths ? `${t.MinTenorMonths} tháng` : '—'}
                            </td>
                            <td className={`p-2.5 text-right font-mono font-bold ${missing ? 'text-rose-500' : 'text-sky-600 dark:text-sky-400'}`}>
                              {missing ? 'CHƯA CÓ' : pct(t.RateAnnual)}
                            </td>
                            <td className="p-2.5 text-right font-mono">{pct(t.MinFeeRatio)}</td>
                        </>
                      </tr>
                    );
                  })}
                  {(kind === 'huy_dong' ? depositRows : lendingTiers).length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        Chương trình chưa có dòng lãi suất nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {program.FloatingSpreadAnnual !== null && program.FloatingSpreadAnnual !== undefined && kind !== 'huy_dong' && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                Sau thời gian cố định: <strong>{program.FloatingBaseLabel || 'LSCS'} + biên độ tối thiểu {pct(program.FloatingSpreadAnnual)}</strong>
                {program.RateResetMonths ? `, kỳ điều chỉnh ${program.RateResetMonths} tháng/lần.` : '.'}
              </div>
            )}
          </div>

          {isAdmin && selectedTier && (
            <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-2`}>
              <div className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
                SỬA THÔNG SỐ (CHỈ ADMIN)
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px]">
                  <label className={labelCls}>Lãi suất của “{selectedTier.Label}” (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editRateStr}
                    onChange={e => setEditRateStr(e.target.value)}
                    placeholder="Để trống = chưa có số"
                    className={`${inputCls} font-bold`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveRate}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>LƯU</span>
                </button>
                {saveMsg && <span className="text-[11px] font-bold text-slate-500">{saveMsg}</span>}
              </div>
              <div className="text-[11px] text-slate-500">
                Để trống nghĩa là <strong>chưa có số</strong> — khác hẳn 0%/năm. Ô trống sẽ chặn việc chào lãi suất cho gói đó.
              </div>
            </div>
          )}

          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-4`}>
            <div className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              {kind === 'huy_dong' ? 'TÍNH LÃI TIỀN GỬI DỰ KIẾN' : 'CHÀO LÃI SUẤT & PHÍ DỊCH VỤ'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>
                  {kind === 'huy_dong' ? 'Số tiền gửi (VND)' : 'Số tiền giải ngân (VND)'}
                </label>
                <input
                  type="text"
                  value={amountStr}
                  onChange={e => setAmountStr(formatMoneyInput(e.target.value))}
                  className={`${inputCls} font-bold text-sky-600 dark:text-sky-400`}
                />
              </div>

              {kind === 'huy_dong' ? (
                <div>
                  <label className={labelCls}>Số ngày gửi (Actual/365)</label>
                  <input
                    type="number"
                    min={0}
                    value={depositDaysStr}
                    onChange={e => setDepositDaysStr(e.target.value)}
                    className={`${inputCls} font-bold`}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Thời gian vay (tháng)</label>
                    <input
                      type="number"
                      min={1}
                      value={tenorStr}
                      onChange={e => setTenorStr(e.target.value)}
                      className={`${inputCls} font-bold`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{program.FloatingBaseLabel || 'LSCS'} hiện hành (%/năm)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={baseRateStr}
                      onChange={e => setBaseRateStr(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>CASA bình quân (VND)</label>
                    <input
                      type="text"
                      value={casaStr}
                      onChange={e => setCasaStr(formatMoneyInput(e.target.value))}
                      placeholder="Để trống nếu chưa soát xét"
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </div>

            {kind !== 'huy_dong' && (
              <label className="flex items-center space-x-2 text-[11px] font-bold text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNewCustomer}
                  onChange={e => setIsNewCustomer(e.target.checked)}
                />
                <span>
                  Khách hàng mới — giảm tối đa {pct(program.NewCustomerFeeDiscount)} phí dịch vụ
                </span>
              </label>
            )}

            {kind === 'huy_dong' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">LÃI SUẤT CHÀO</div>
                  <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 font-mono mt-1">
                    {selectedTier?.RateAnnual === null || selectedTier?.RateAnnual === undefined
                      ? 'CHƯA CÓ'
                      : `${(selectedTier.RateAnnual * 100).toFixed(2)} %/năm`}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">{selectedTier?.Label || '—'}</div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">TIỀN LÃI DỰ KIẾN</div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {depositInterest === null ? '—' : fmtMoney(depositInterest)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {fmtMoney(amount)} × lãi suất × {depositDays}/365
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">LSCV TRONG THỜI GIAN CỐ ĐỊNH</div>
                  <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 font-mono mt-1">
                    {selectedTier?.RateAnnual === null || selectedTier?.RateAnnual === undefined
                      ? 'CHƯA CÓ'
                      : `${(selectedTier.RateAnnual * 100).toFixed(2)} %/năm`}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {selectedTier?.Label || '—'}
                    {selectedTier?.FixedMonths ? ` • cố định ${selectedTier.FixedMonths} tháng` : ''}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">LSCV SAU THỜI GIAN CỐ ĐỊNH</div>
                  <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-1">
                    {postFixedRate === null ? '—' : `${(postFixedRate * 100).toFixed(2)} %/năm`}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {program.FloatingBaseLabel || 'LSCS'} {pct(baseRate)} + biên độ {pct(program.FloatingSpreadAnnual)}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">PHÍ DỊCH VỤ TỐI THIỂU</div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {fee.feeAmount === null ? '—' : fmtMoney(fee.feeAmount)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 space-y-0.5">
                    <div>Tỷ lệ áp dụng: <strong>{pct(fee.effectiveRatio)}</strong></div>
                    {fee.casaAddonApplied && (
                      <div className="text-amber-600 dark:text-amber-400">
                        + {pct(program.CasaShortfallFeeAddon)} do CASA bình quân dưới {pct(program.CasaMinRatio)} dư nợ
                        {fee.casaRequiredAmount !== null && ` (cần ${fmtMoney(fee.casaRequiredAmount)})`}
                      </div>
                    )}
                    {fee.minFeeApplied && (
                      <div>Đã nâng lên mức sàn {fmtMoney(program.MinFeeAmountVnd)}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {blocked && (
              <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
                Không được dùng kết quả trên để chào khách khi còn cảnh báo đỏ ở trên.
              </div>
            )}
          </div>

          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
            <div className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center space-x-1.5">
              <Printer className="w-4 h-4" />
              <span>XUẤT BẢNG LÃI SUẤT GỬI KHÁCH HÀNG</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className={labelCls}>Nhân viên tư vấn (in trên file, có thể bỏ trống)</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={e => setPreparedBy(e.target.value)}
                  placeholder="Họ tên · số điện thoại"
                  className={inputCls}
                />
              </div>
              <button
                type="button"
                onClick={handleExportSheet}
                disabled={sheetBlockers.length > 0}
                className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-4 py-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>XUẤT PDF / HÌNH ẢNH</span>
              </button>
            </div>

            {programFeeOptions.length > 0 && (
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeFeeInSheet}
                  onChange={e => setIncludeFeeInSheet(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-sky-600"
                />
                <span className="text-[11px] leading-relaxed">
                  <span className="font-bold">Kèm bảng phí dịch vụ trong file gửi khách hàng</span>
                  <span className="block text-slate-500 dark:text-slate-400">
                    {includeFeeInSheet
                      ? `File sẽ có bảng ${programFeeOptions.length} phương án phí dịch vụ.`
                      : 'File chỉ ghi một dòng là chương trình có phí dịch vụ, mức phí tư vấn theo phương án khách hàng chọn.'}
                  </span>
                </span>
              </label>
            )}

            {sheetBlockers.length > 0 ? (
              <div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 space-y-1">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                  Chưa xuất được file cho khách hàng:
                </div>
                {sheetBlockers.map((b, i) => (
                  <div key={i} className="text-[11px] text-rose-700 dark:text-rose-300">• {b.message}</div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500 space-y-0.5">
                <div>
                  Bấm nút để mở bản in khổ A4. Trong hộp thoại in, chọn <strong>“Save as PDF”</strong> để lưu file,
                  hoặc chụp ảnh màn hình nếu cần gửi dạng hình.
                </div>
                <div>
                  File chỉ gồm lãi suất, điều kiện và phí công bố của chương trình — không chứa thông tin nội bộ
                  như COF, biên độ lợi nhuận hay dữ liệu khách hàng khác.
                </div>
              </div>
            )}
          </div>

          {programFeeOptions.length > 0 && (
            <div className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
              <button
                type="button"
                onClick={() => setShowFeeTable(v => !v)}
                className="w-full p-3 flex items-center justify-between gap-2 font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
              >
                <span>PHÍ DỊCH VỤ THEO PHƯƠNG ÁN ({programFeeOptions.length} phương án)</span>
                <span className="flex items-center gap-1 normal-case font-medium text-slate-500 dark:text-slate-400">
                  {showFeeTable ? 'Ẩn bảng' : 'Xem bảng'}
                  {showFeeTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </button>
              <div className={`overflow-x-auto border-t border-slate-200 dark:border-slate-800 ${showFeeTable ? '' : 'hidden'}`}>
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">PHƯƠNG ÁN</th>
                      <th className="p-2.5">NHÓM GÓI CỐ ĐỊNH</th>
                      <th className="p-2.5 text-right">PHÍ TỐI THIỂU</th>
                      <th className="p-2.5 text-right">TRONG ĐÓ TẠI QUẦY / TKSĐ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {programFeeOptions.map(o => (
                      <tr key={o.Id}>
                        <td className="p-2.5 font-bold">{o.OptionLabel}</td>
                        <td className="p-2.5">{o.PackageGroup}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                          {pct(o.MinFeeRatio)}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          {o.CounterFeeRatio === null || o.CounterFeeRatio === undefined
                            ? '—' : pct(o.CounterFeeRatio)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {programConditions.length > 0 && (
            <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-1.5`}>
              <div className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                ĐIỀU KIỆN ÁP DỤNG
              </div>
              {programConditions.map(c => (
                <div key={c.Id} className="text-[11px] text-slate-600 dark:text-slate-300">
                  • {c.Heading && <strong>{c.Heading}: </strong>}{c.Content}
                </div>
              ))}
            </div>
          )}

          {programPrepayFees.length > 0 && (
            <div className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
                PHÍ TRẢ NỢ TRƯỚC HẠN
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">NĂM</th>
                      <th className="p-2.5 text-right">MỨC PHÍ</th>
                      <th className="p-2.5">GHI CHÚ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {programPrepayFees.map(f => {
                      const missing = f.FeeRatio === null || f.FeeRatio === undefined;
                      return (
                        <tr key={f.Id} className={missing ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}>
                          <td className="p-2.5 font-mono">
                            {f.YearTo === null || f.YearTo === undefined
                              ? `Từ năm ${f.YearFrom} trở đi`
                              : f.YearFrom === f.YearTo ? `Năm ${f.YearFrom}` : `Năm ${f.YearFrom} – ${f.YearTo}`}
                          </td>
                          <td className={`p-2.5 text-right font-mono font-bold ${missing ? 'text-rose-500' : ''}`}>
                            {missing ? 'THIẾU SỐ' : f.FeeRatio === 0 ? 'Miễn phí' : pct(f.FeeRatio)}
                          </td>
                          <td className="p-2.5 text-slate-500">{f.Note || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {programAuthorities.length > 0 && (
            <div className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center space-x-1.5">
                <Landmark className="w-4 h-4" />
                <span>THẨM QUYỀN ĐIỀU CHỈNH LÃI SUẤT TIỀN GỬI</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">THẨM QUYỀN</th>
                      <th className="p-2.5">KỲ HẠN</th>
                      <th className="p-2.5 text-right">HIỆN TẠI</th>
                      <th className="p-2.5 text-right">ĐIỀU CHỈNH</th>
                      <th className="p-2.5 text-right">+/-</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {programAuthorities.map(a => {
                      const delta =
                        a.CurrentRate !== null && a.CurrentRate !== undefined
                        && a.AdjustedRate !== null && a.AdjustedRate !== undefined
                          ? a.AdjustedRate - a.CurrentRate
                          : null;
                      return (
                        <tr key={a.Id}>
                          <td className="p-2.5 font-bold">{a.AuthorityLevel}</td>
                          <td className="p-2.5">{a.TenorLabel}</td>
                          <td className="p-2.5 text-right font-mono">{pct(a.CurrentRate)}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                            {pct(a.AdjustedRate)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                            {delta === null ? '—' : `+${(delta * 100).toFixed(2)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {programFbeCodes.length > 0 && (
            <div className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
                HƯỚNG DẪN NHẬP LIỆU TRÊN FBE
              </div>
              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">ĐỐI TƯỢNG ÁP DỤNG</th>
                      <th className="p-2.5 text-center">MÃ RATE ID</th>
                      <th className="p-2.5">DIỄN GIẢI</th>
                      <th className="p-2.5">RATE ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(['co_dinh_suot_thoi_gian_vay', 'co_dinh_ky_dau', 'data_udf'] as const).map(scope => {
                      const rows = programFbeCodes.filter(c => c.Scope === scope);
                      if (rows.length === 0) return null;
                      return (
                        <React.Fragment key={scope}>
                          <tr className="bg-slate-50 dark:bg-slate-800/40">
                            <td colSpan={4} className="p-2 font-bold text-slate-600 dark:text-slate-300">
                              {FBE_SCOPE_LABELS[scope]}
                            </td>
                          </tr>
                          {rows.map(c => (
                            <tr key={c.Id}>
                              <td className="p-2.5">{c.Applies}</td>
                              <td className="p-2.5 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                                {c.RateIdCode || '—'}
                              </td>
                              <td className="p-2.5 font-mono">{c.Description || '—'}</td>
                              <td className="p-2.5">{c.RateIdValue || '—'}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                Nhập Reset frequency: <strong>Quarterly</strong>. Reset date: gói cố định suốt thời gian vay không nhập;
                gói cố định kỳ đầu nhập ngày hết hạn áp dụng gói cố định.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
