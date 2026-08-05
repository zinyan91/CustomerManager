import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, CheckCircle, AlertCircle, Loader2, Save, X } from 'lucide-react';
import {
  fetchContractsAPI, fetchCollateralsAPI, fetchCustomersAPI,
  fetchPostLoanControlRecordsAPI, savePostLoanControlRecordAPI,
  saveCollateralAppraisalAPI,
} from '../../lib/api';
import type { Collateral, Customer, LoanContract, PostLoanControlRecord, ControlResult } from '../../types';
import {
  generateControlSchedule, mergeControlRecords, summarizeWithRecords,
  CONTROL_TYPE_LABEL, CONTROL_RESULT_LABEL, overdueDaysOf,
  type ControlItemWithRecord, type ControlType,
} from '../../lib/postLoanControl';
import { fmtDate, fmtMoney, formatMoneyInput, parseMoneyInput, todayIso } from '../../lib/utils';
import { assetClassLabel, defaultLtvForAssetType } from '../../lib/collateralMath';
import { useTheme } from '../../context/ThemeContext';
import { getThemeStyles } from '../../lib/themeStyles';
import { DateInput } from '../DateInput';

type FilterType = 'ALL' | ControlType;
type FilterStatus = 'pending' | 'overdue' | 'done' | 'ALL';

export const PostLoanControlView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const styles = getThemeStyles(isLight);

  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [records, setRecords] = useState<PostLoanControlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [collateralIntervalMonths, setCollateralIntervalMonths] = useState<6 | 12>(12);

  const [editing, setEditing] = useState<ControlItemWithRecord | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalResult, setModalResult] = useState<ControlResult>('pass');
  const [modalFindings, setModalFindings] = useState('');
  const [modalReappraise, setModalReappraise] = useState(false);
  const [modalValue, setModalValue] = useState('');
  const [modalAssetType, setModalAssetType] = useState('Loại 1');
  const [modalTenor, setModalTenor] = useState<6 | 12 | 24>(12);
  const [saving, setSaving] = useState(false);

  const today = todayIso();

  useEffect(() => { loadAll(); }, []);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cons, cols, custs, recs] = await Promise.all([
        fetchContractsAPI(),
        fetchCollateralsAPI(),
        fetchCustomersAPI(),
        fetchPostLoanControlRecordsAPI(),
      ]);
      setContracts(cons);
      setCollaterals(cols);
      setCustomers(custs);
      setRecords(recs);
    } catch (err: any) {
      showNotify('error', `Lỗi tải dữ liệu kiểm soát sau vay: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const items = useMemo(() => {
    const schedule = generateControlSchedule({
      contracts, collaterals, todayStr: today,
      collateralIntervalMonths,
    });
    return mergeControlRecords(schedule, records);
  }, [contracts, collaterals, records, collateralIntervalMonths]);

  const summary = useMemo(() => summarizeWithRecords(items), [items]);

  const filtered = useMemo(() => items.filter(it => {
    if (filterType !== 'ALL' && it.type !== filterType) return false;
    if (filterStatus === 'pending') return it.status !== 'done';
    if (filterStatus === 'overdue') return it.status === 'overdue';
    if (filterStatus === 'done') return it.status === 'done';
    return true;
  }), [items, filterType, filterStatus]);

  const customerName = (id: number) =>
    customers.find(c => c.Id === id)?.FullName || `KH #${id}`;
  const customerCif = (id: number) =>
    customers.find(c => c.Id === id)?.CifKh || '';

  const openModal = (it: ControlItemWithRecord) => {
    setEditing(it);
    setModalDate(it.record?.PerformedDate || today);
    setModalResult(it.record?.Result || 'pass');
    setModalFindings(it.record?.Findings || '');
    setModalReappraise(false);
    const col = it.collateralId ? collaterals.find(c => c.Id === it.collateralId) : undefined;
    setModalValue(col?.AppraisedValue ? col.AppraisedValue.toLocaleString('vi-VN') : '');
    setModalAssetType(assetClassLabel(col?.AssetType) || 'Loại 1');
    setModalTenor((col?.AppraisalTenorMonths as 6 | 12 | 24) || 12);
  };

  const closeModal = () => setEditing(null);

  const handleSave = async () => {
    if (!editing) return;
    if (!modalDate) { showNotify('error', 'Vui lòng nhập ngày thực hiện kiểm tra!'); return; }

    setSaving(true);
    try {
      let appraisalId: number | null = editing.record?.AppraisalId ?? null;

      if (modalReappraise && editing.collateralId) {
        const value = parseMoneyInput(modalValue);
        if (!value) throw new Error('Vui lòng nhập giá trị định giá mới!');
        const appraisal = await saveCollateralAppraisalAPI({
          CollateralId: editing.collateralId,
          AppraisalDate: modalDate,
          TenorMonths: modalTenor,
          AppraisedValue: value,
          AssetType: modalAssetType,
          LtvPercent: defaultLtvForAssetType(modalAssetType),
          Note: `Định giá lại từ đợt kiểm tra hiện trạng tài sản kỳ ${editing.periodIndex}`,
        });
        appraisalId = appraisal.Id;
      }

      await savePostLoanControlRecordAPI({
        ControlType: editing.type,
        ControlKey: editing.key,
        CustomerId: editing.customerId,
        ContractId: editing.type === 'purpose' ? editing.contractIds[0] : null,
        MasterHdtd: editing.masterHdtd ?? null,
        CollateralId: editing.collateralId ?? null,
        PeriodIndex: editing.periodIndex,
        DueDate: editing.dueDate,
        PerformedDate: modalDate,
        Result: modalResult,
        Findings: modalFindings.trim() || null,
        AppraisalId: appraisalId,
      });

      showNotify('success', 'Đã ghi nhận kết quả kiểm soát sau vay!');
      closeModal();
      await loadAll();
    } catch (err: any) {
      showNotify('error', err.message || 'Lỗi ghi nhận kết quả.');
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (it: ControlItemWithRecord) => {
    if (it.status === 'done') {
      const r = it.record?.Result;
      const color = r === 'fail'
        ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700'
        : r === 'watch'
          ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700'
          : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700';
      return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${color}`}>
          {r ? CONTROL_RESULT_LABEL[r] : 'Đã thực hiện'}
        </span>
      );
    }
    if (it.status === 'overdue') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-700">
          Quá hạn {overdueDaysOf(it)} ngày
        </span>
      );
    }
    if (it.status === 'due_soon') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
          Còn {it.daysRemaining} ngày
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700">
        Còn {it.daysRemaining} ngày
      </span>
    );
  };

  const scopeOf = (it: ControlItemWithRecord) => {
    if (it.type === 'purpose') return it.contractNumbers[0] || '—';
    if (it.type === 'periodic') return `${it.masterHdtd} · ${it.contractNumbers.length} KUNN`;
    return `TSĐB ${it.assetCode}`;
  };

  const cardBg = isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const inputStyle = isLight
    ? 'bg-white border-slate-300 text-slate-900'
    : 'bg-slate-800 border-slate-700 text-slate-100';

  return (
    <div className="space-y-4 text-xs">
      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-start space-x-3 text-sm max-w-md ${
          notification.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
            : 'bg-red-950/90 border-red-500/40 text-red-300'
        }`}>
          {notification.type === 'success'
            ? <CheckCircle className="w-5 h-5 shrink-0" />
            : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm`}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5" />
          <span>KIỂM SOÁT SAU VAY & GIÁM SÁT TÍN DỤNG</span>
        </h2>
        <p className="text-[11px] text-slate-400 mt-1">
          Mục đích sử dụng vốn: 30 ngày kể từ giải ngân, mỗi KUNN một đợt ·
          Kiểm tra sau vay: 3 tháng một lần, gộp theo HĐTD ·
          Hiện trạng tài sản: {collateralIntervalMonths} tháng một lần kể từ ngày định giá
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Quá hạn', value: summary.overdue, color: 'text-rose-600 dark:text-rose-400' },
          { label: 'Sắp tới hạn', value: summary.dueSoon, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Chưa tới hạn', value: summary.upcoming, color: 'text-slate-500' },
          { label: 'Đã thực hiện', value: summary.done, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map(s => (
          <div key={s.label} className={`${cardBg} rounded-2xl p-3 border shadow-sm`}>
            <div className="text-[10px] uppercase text-slate-400 font-semibold">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className={`${cardBg} rounded-2xl p-3 border shadow-sm flex flex-wrap items-center gap-2`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            ['ALL', 'Tất cả loại'],
            ['purpose', 'Mục đích sử dụng vốn'],
            ['periodic', 'Kiểm tra sau vay'],
            ['collateral', 'Hiện trạng tài sản'],
          ] as [FilterType, string][]).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setFilterType(v)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors ${
                filterType === v
                  ? 'bg-sky-600 text-white border-sky-500'
                  : isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            ['pending', 'Còn phải làm'],
            ['overdue', 'Chỉ quá hạn'],
            ['done', 'Đã thực hiện'],
            ['ALL', 'Tất cả'],
          ] as [FilterStatus, string][]).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setFilterStatus(v)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors ${
                filterStatus === v
                  ? 'bg-purple-600 text-white border-purple-500'
                  : isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Chu kỳ kiểm tra TSĐB</span>
          {([6, 12] as const).map(m => (
            <button key={m} type="button" onClick={() => setCollateralIntervalMonths(m)}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
                collateralIntervalMonths === m
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
              {m} tháng
            </button>
          ))}
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
        <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
          <span className="font-bold text-xs">DANH SÁCH ĐỢT KIỂM SOÁT ({filtered.length})</span>
          <span className="text-[11px] text-slate-400">Nhấp "Ghi nhận" để lưu kết quả kiểm tra</span>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500 mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={styles.tableHeaderStyle}>
                <tr>
                  <th className="p-3 whitespace-nowrap">KHÁCH HÀNG / CIF</th>
                  <th className="p-3 whitespace-nowrap">LOẠI KIỂM TRA</th>
                  <th className="p-3 whitespace-nowrap">PHẠM VI</th>
                  <th className="p-3 whitespace-nowrap text-center">KỲ</th>
                  <th className="p-3 whitespace-nowrap text-center">NGÀY ĐẾN HẠN</th>
                  <th className="p-3 whitespace-nowrap text-center">TRẠNG THÁI</th>
                  <th className="p-3 whitespace-nowrap text-center">NGÀY THỰC HIỆN</th>
                  <th className="p-3 whitespace-nowrap text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center p-8 text-slate-400">Không có đợt kiểm soát nào theo bộ lọc hiện tại.</td></tr>
                ) : filtered.slice(0, 300).map(it => (
                  <tr key={it.key} className={styles.tableRowHover}>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold">{customerName(it.customerId)}</div>
                      <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400">
                        {customerCif(it.customerId) && `CIF: ${customerCif(it.customerId)}`}
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap text-purple-600 dark:text-purple-400 font-semibold">
                      {CONTROL_TYPE_LABEL[it.type]}
                    </td>
                    <td className="p-3 font-mono text-[11px]">{scopeOf(it)}</td>
                    <td className="p-3 text-center font-mono">{it.periodIndex}</td>
                    <td className="p-3 text-center font-mono whitespace-nowrap">{fmtDate(it.dueDate)}</td>
                    <td className="p-3 text-center whitespace-nowrap">{statusBadge(it)}</td>
                    <td className="p-3 text-center font-mono whitespace-nowrap text-slate-500">
                      {it.record ? fmtDate(it.record.PerformedDate) : '—'}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button type="button" onClick={() => openModal(it)}
                        className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold border-sky-300 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950">
                        {it.record ? 'Xem / Sửa' : 'Ghi nhận'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 300 && (
              <div className="p-3 text-center text-[11px] text-slate-400 border-t border-slate-200 dark:border-slate-800">
                Đang hiển thị 300 / {filtered.length} đợt. Dùng bộ lọc để thu hẹp danh sách.
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-2xl border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
            <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <div>
                <div className="font-bold text-sm">{CONTROL_TYPE_LABEL[editing.type]}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {customerName(editing.customerId)} · {scopeOf(editing)} · kỳ {editing.periodIndex} ·
                  đến hạn {fmtDate(editing.dueDate)}
                </div>
              </div>
              <button type="button" onClick={closeModal} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày thực hiện *</label>
                  <DateInput value={modalDate} onChange={setModalDate}
                    className={`w-full rounded-xl p-2.5 text-xs border font-mono ${inputStyle}`} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Kết luận *</label>
                  <select value={modalResult} onChange={e => setModalResult(e.target.value as ControlResult)}
                    className={`w-full rounded-xl p-2.5 text-xs border ${inputStyle}`}>
                    <option value="pass">Đạt</option>
                    <option value="watch">Cần theo dõi</option>
                    <option value="fail">Không đạt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Nội dung ghi nhận</label>
                <textarea value={modalFindings} onChange={e => setModalFindings(e.target.value)} rows={3}
                  placeholder="Tình hình thực tế, vấn đề phát hiện, kiến nghị..."
                  className={`w-full rounded-xl p-2.5 text-xs border ${inputStyle}`} />
              </div>

              {editing.type === 'collateral' && editing.collateralId && (
                <div className={`rounded-xl border p-3 space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                  <label className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={modalReappraise}
                      onChange={e => setModalReappraise(e.target.checked)} />
                    Định giá lại tài sản trong đợt kiểm tra này
                  </label>

                  {modalReappraise && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3 md:col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Giá trị định giá mới *</label>
                        <input type="text" value={modalValue}
                          onChange={e => setModalValue(formatMoneyInput(e.target.value))}
                          className={`w-full rounded-xl p-2.5 text-xs border font-mono font-bold text-emerald-600 dark:text-emerald-400 ${inputStyle}`} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Xếp loại</label>
                        <select value={modalAssetType} onChange={e => setModalAssetType(e.target.value)}
                          className={`w-full rounded-xl p-2.5 text-xs border ${inputStyle}`}>
                          {['Loại 1', 'Loại 2', 'Loại 3', 'Loại 4', 'Hạn chế nhận TS'].map(t => (
                            <option key={t} value={t}>{assetClassLabel(t)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Hiệu lực</label>
                        <select value={modalTenor} onChange={e => setModalTenor(parseInt(e.target.value) as 6 | 12 | 24)}
                          className={`w-full rounded-xl p-2.5 text-xs border ${inputStyle}`}>
                          <option value={6}>6 tháng</option>
                          <option value={12}>12 tháng</option>
                          <option value={24}>24 tháng</option>
                        </select>
                      </div>
                      <div className="col-span-3 text-[10px] text-slate-400 leading-snug">
                        LTV áp dụng theo xếp loại: <strong>{defaultLtvForAssetType(modalAssetType)}%</strong> —
                        hạn mức cho vay tối đa{' '}
                        <strong className="text-sky-600 dark:text-sky-400">
                          {fmtMoney((parseMoneyInput(modalValue)) * defaultLtvForAssetType(modalAssetType) / 100)}
                        </strong>.
                        Giá trị này sẽ trở thành định giá hiện hành của tài sản.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`p-4 border-t flex items-center justify-end gap-2 ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <button type="button" onClick={closeModal}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border ${isLight ? 'border-slate-300 text-slate-700' : 'border-slate-700 text-slate-300'}`}>
                Huỷ
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu kết quả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
