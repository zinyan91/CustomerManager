import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Loader2, Save, X } from 'lucide-react';
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
import { UI } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { AdaptiveTable } from '../AdaptiveTable';

type FilterType = 'ALL' | ControlType;
type FilterStatus = 'pending' | 'overdue' | 'done' | 'ALL';

export const PostLoanControlView: React.FC = () => {

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
        ? 'bg-neg-soft text-neg border-neg/30 '
        : r === 'watch'
          ? 'bg-warn-soft text-warn border-warn/30 '
          : 'bg-pos-soft text-pos border-pos/30 ';
      return (
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${color}`}>
          {r ? CONTROL_RESULT_LABEL[r] : 'Đã thực hiện'}
        </span>
      );
    }
    if (it.status === 'overdue') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-neg-soft text-neg border-neg/30 ">
          Quá hạn {overdueDaysOf(it)} ngày
        </span>
      );
    }
    if (it.status === 'due_soon') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-warn-soft text-warn border-warn/30 ">
          Còn {it.daysRemaining} ngày
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-panel-muted text-ink-faint border-line">
        Còn {it.daysRemaining} ngày
      </span>
    );
  };

  const scopeOf = (it: ControlItemWithRecord) => {
    if (it.type === 'purpose') return it.contractNumbers[0] || '—';
    if (it.type === 'periodic') return `${it.masterHdtd} · ${it.contractNumbers.length} KUNN`;
    return `TSĐB ${it.assetCode}`;
  };

  const cardBg = UI.containerCardBg;
  const inputStyle = UI.inputStyle;

  return (
    <div className="space-y-4 text-xs">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      <div className={`${cardBg} rounded-lg p-4 border`}>
        <h2 className="text-sm font-bold tracking-tight text-accent flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5" />
          <span>KIỂM SOÁT SAU VAY & GIÁM SÁT TÍN DỤNG</span>
        </h2>
        <p className="text-[11px] text-ink-faint mt-1">
          Mục đích sử dụng vốn: 30 ngày kể từ giải ngân, mỗi KUNN một đợt ·
          Kiểm tra sau vay: 3 tháng một lần, gộp theo HĐTD ·
          Hiện trạng tài sản: {collateralIntervalMonths} tháng một lần kể từ ngày định giá
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Quá hạn', value: summary.overdue, color: 'text-neg' },
          { label: 'Sắp tới hạn', value: summary.dueSoon, color: 'text-warn' },
          { label: 'Chưa tới hạn', value: summary.upcoming, color: 'text-ink-faint' },
          { label: 'Đã thực hiện', value: summary.done, color: 'text-pos' },
        ].map(s => (
          <div key={s.label} className={`${cardBg} rounded-lg p-3 border`}>
            <div className="text-[10px] uppercase text-ink-faint font-semibold">{s.label}</div>
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className={`${cardBg} rounded-lg p-3 border flex flex-wrap items-center gap-2`}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            ['ALL', 'Tất cả loại'],
            ['purpose', 'Mục đích sử dụng vốn'],
            ['periodic', 'Kiểm tra sau vay'],
            ['collateral', 'Hiện trạng tài sản'],
          ] as [FilterType, string][]).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setFilterType(v)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                filterType === v
                  ? 'bg-accent text-accent-ink border-accent'
                  : 'bg-panel-muted text-ink-muted border-line'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-panel-muted mx-1" />

        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            ['pending', 'Còn phải làm'],
            ['overdue', 'Chỉ quá hạn'],
            ['done', 'Đã thực hiện'],
            ['ALL', 'Tất cả'],
          ] as [FilterStatus, string][]).map(([v, label]) => (
            <button key={v} type="button" onClick={() => setFilterStatus(v)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                filterStatus === v
                  ? 'bg-accent text-accent-ink border-accent'
                  : 'bg-panel-muted text-ink-muted border-line'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-ink-faint uppercase font-semibold">Chu kỳ kiểm tra TSĐB</span>
          {([6, 12] as const).map(m => (
            <button key={m} type="button" onClick={() => setCollateralIntervalMonths(m)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-colors ${
                collateralIntervalMonths === m
                  ? 'bg-pos text-accent-ink border-pos'
                  : 'bg-panel-muted text-ink-muted border-line'
              }`}>
              {m} tháng
            </button>
          ))}
        </div>
      </div>

      <div className={`${cardBg} rounded-lg border overflow-hidden`}>
        <div className={`p-3 border-b flex items-center justify-between ${'bg-panel-muted border-line'}`}>
          <span className="font-bold text-xs">DANH SÁCH ĐỢT KIỂM SOÁT ({filtered.length})</span>
          <span className="text-[11px] text-ink-faint">Nhấp "Ghi nhận" để lưu kết quả kiểm tra</span>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <AdaptiveTable
              maxHeight="620px"
              rows={filtered.slice(0, 300)}
              rowKey={it => it.key}
              emptyText="Không có đợt kiểm soát nào theo bộ lọc hiện tại."
              cardTitle={it => customerName(it.customerId)}
              cardSubtitle={it => customerCif(it.customerId)}
              actions={it => (
                <button type="button" onClick={() => openModal(it)}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold border-accent/30 text-accent hover:bg-accent-soft">
                  {it.record ? 'Xem / Sửa' : 'Ghi nhận'}
                </button>
              )}
              columns={[
          { key: 'kh', label: 'Khách hàng / CIF', priority: 3, render: it => (
                  <>
                    <div className="font-bold">{customerName(it.customerId)}</div>
                    <div className="text-[10px] font-mono text-accent">
                      {customerCif(it.customerId) && `CIF: ${customerCif(it.customerId)}`}
                    </div>
                  </>
                ) },
          { key: 'loai', label: 'Loại kiểm tra', priority: 1,
                  render: it => <span className="text-accent font-semibold">{CONTROL_TYPE_LABEL[it.type]}</span> },
          { key: 'phamVi', label: 'Phạm vi', priority: 2,
                  render: it => <span className="font-mono text-[11px]">{scopeOf(it)}</span> },
          { key: 'ky', label: 'Kỳ', priority: 2, align: 'center',
                  render: it => <span className="font-mono">{it.periodIndex}</span> },
          { key: 'denHan', label: 'Ngày đến hạn', priority: 1, align: 'center',
                  render: it => <span className="font-mono">{fmtDate(it.dueDate)}</span> },
          { key: 'trangThai', label: 'Trạng thái', priority: 1, align: 'center', render: it => statusBadge(it) },
          { key: 'thucHien', label: 'Ngày thực hiện', priority: 2, align: 'center',
                  render: it => <span className="font-mono text-ink-faint">{it.record ? fmtDate(it.record.PerformedDate) : '—'}</span> },
        ]}
            />
            {filtered.length > 300 && (
              <div className="p-3 text-center text-[11px] text-ink-faint border-t border-line">
                Đang hiển thị 300 / {filtered.length} đợt. Dùng bộ lọc để thu hẹp danh sách.
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-lg border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
            <div className={`p-4 border-b flex items-center justify-between ${'border-line'}`}>
              <div>
                <div className="font-bold text-sm">{CONTROL_TYPE_LABEL[editing.type]}</div>
                <div className="text-[11px] text-ink-faint mt-0.5">
                  {customerName(editing.customerId)} · {scopeOf(editing)} · kỳ {editing.periodIndex} ·
                  đến hạn {fmtDate(editing.dueDate)}
                </div>
              </div>
              <button type="button" onClick={closeModal} className="p-1.5 rounded-lg hover:bg-panel-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-ink-faint mb-1">Ngày thực hiện *</label>
                  <DateInput value={modalDate} onChange={setModalDate}
                    className={`w-full rounded-md p-2.5 text-xs border font-mono ${inputStyle}`} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-ink-faint mb-1">Kết luận *</label>
                  <select value={modalResult} onChange={e => setModalResult(e.target.value as ControlResult)}
                    className={`w-full rounded-md p-2.5 text-xs border ${inputStyle}`}>
                    <option value="pass">Đạt</option>
                    <option value="watch">Cần theo dõi</option>
                    <option value="fail">Không đạt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Nội dung ghi nhận</label>
                <textarea value={modalFindings} onChange={e => setModalFindings(e.target.value)} rows={3}
                  placeholder="Tình hình thực tế, vấn đề phát hiện, kiến nghị..."
                  className={`w-full rounded-md p-2.5 text-xs border ${inputStyle}`} />
              </div>

              {editing.type === 'collateral' && editing.collateralId && (
                <div className={`rounded-md border p-3 space-y-3 ${'bg-panel-muted border-line'}`}>
                  <label className="flex items-center gap-2 text-[11px] font-bold text-ink-muted cursor-pointer">
                    <input type="checkbox" checked={modalReappraise}
                      onChange={e => setModalReappraise(e.target.checked)} />
                    Định giá lại tài sản trong đợt kiểm tra này
                  </label>

                  {modalReappraise && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3 md:col-span-1">
                        <label className="block text-[10px] font-bold text-ink-faint mb-1">Giá trị định giá mới *</label>
                        <input type="text" value={modalValue}
                          onChange={e => setModalValue(formatMoneyInput(e.target.value))}
                          className={`w-full rounded-md p-2.5 text-xs border font-mono font-bold text-pos ${inputStyle}`} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-faint mb-1">Xếp loại</label>
                        <select value={modalAssetType} onChange={e => setModalAssetType(e.target.value)}
                          className={`w-full rounded-md p-2.5 text-xs border ${inputStyle}`}>
                          {['Loại 1', 'Loại 2', 'Loại 3', 'Loại 4', 'Hạn chế nhận TS'].map(t => (
                            <option key={t} value={t}>{assetClassLabel(t)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-ink-faint mb-1">Hiệu lực</label>
                        <select value={modalTenor} onChange={e => setModalTenor(parseInt(e.target.value) as 6 | 12 | 24)}
                          className={`w-full rounded-md p-2.5 text-xs border ${inputStyle}`}>
                          <option value={6}>6 tháng</option>
                          <option value={12}>12 tháng</option>
                          <option value={24}>24 tháng</option>
                        </select>
                      </div>
                      <div className="col-span-3 text-[10px] text-ink-faint leading-snug">
                        LTV áp dụng theo xếp loại: <strong>{defaultLtvForAssetType(modalAssetType)}%</strong> —
                        hạn mức cho vay tối đa{' '}
                        <strong className="text-accent">
                          {fmtMoney((parseMoneyInput(modalValue)) * defaultLtvForAssetType(modalAssetType) / 100)}
                        </strong>.
                        Giá trị này sẽ trở thành định giá hiện hành của tài sản.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={`p-4 border-t flex items-center justify-end gap-2 ${'border-line'}`}>
              <button type="button" onClick={closeModal}
                className={`px-3 py-2 rounded-md text-xs font-semibold border ${'border-line text-ink-muted'}`}>
                Huỷ
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                className="px-3 py-2 rounded-md text-xs font-bold bg-accent hover:opacity-90 text-accent-ink flex items-center gap-1.5 disabled:opacity-60">
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
