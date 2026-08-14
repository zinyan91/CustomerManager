import React from 'react';
import { ShieldCheck, Loader2, Save, X } from 'lucide-react';
import { CONTROL_TYPE_LABEL, type ControlItemWithRecord } from '../../lib/postLoanControl';
import { fmtDate, fmtMoney, formatMoneyInput, parseMoneyInput } from '../../lib/utils';
import { assetClassLabel, defaultLtvForAssetType } from '../../lib/collateralMath';
import { UI } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { AdaptiveTable, type AdaptiveColumn } from '../AdaptiveTable';
import {
  usePostLoanControlController,
  type FilterType,
  type FilterStatus,
} from '../../hooks/usePostLoanControlController';
import type { ControlResult } from '../../types';

export const PostLoanControlView: React.FC = () => {
  const {
    selectedCustomerId,
    setSelectedCustomerId,
    loading,
    notification,
    setNotification,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    collateralIntervalMonths,
    setCollateralIntervalMonths,
    editing,
    modalDate,
    setModalDate,
    modalResult,
    setModalResult,
    modalFindings,
    setModalFindings,
    modalReappraise,
    setModalReappraise,
    modalValue,
    setModalValue,
    modalAssetType,
    setModalAssetType,
    modalTenor,
    setModalTenor,
    saving,
    summary,
    portfolioOverdue,
    customerOptions,
    filtered,
    customerName,
    customerCif,
    openModal,
    closeModal,
    handleSave,
    statusBadge,
    scopeOf,
  } = usePostLoanControlController();

  const allColumns: AdaptiveColumn<ControlItemWithRecord>[] = [
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
  ];

  const columns = selectedCustomerId ? allColumns.filter(col => col.key !== 'kh') : allColumns;
  const cardBg = UI.containerCardBg;
  const inputStyle = UI.inputStyle;

  return (
    <div className="space-y-4 text-xs">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Header Banner */}
      <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-1`}>
        <h2 className="text-sm font-bold tracking-tight text-accent flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-accent" />
          <span>KIỂM SOÁT SAU VAY & GIÁM SÁT TÍN DỤNG</span>
        </h2>
        <p className="text-[11px] text-ink-faint">
          Mục đích sử dụng vốn: 30 ngày kể từ giải ngân, mỗi KUNN một đợt ·
          Kiểm tra sau vay: 3 tháng một lần, gộp theo HĐTD ·
          Hiện trạng tài sản: {collateralIntervalMonths} tháng một lần kể từ ngày định giá
        </p>
      </div>

      {/* Customer Selector */}
      <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-2`}>
        <label className={`block text-xs ${UI.labelStyle}`}>
          Khách hàng ({customerOptions.length} KH có đợt kiểm soát)
        </label>
        <div className="flex items-center gap-2">
          <select
            value={selectedCustomerId ?? ''}
            onChange={e => setSelectedCustomerId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className={`flex-1 rounded-lg p-2.5 text-xs font-semibold border border-line ${inputStyle}`}
          >
            <option value="">— Tất cả khách hàng —</option>
            {customerOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          {selectedCustomerId && (
            <button type="button" onClick={() => setSelectedCustomerId(null)}
              className="px-2.5 py-2 rounded-md border text-[11px] font-semibold border-line text-ink-muted hover:bg-panel-muted shrink-0">
              Bỏ chọn
            </button>
          )}
        </div>
        {selectedCustomerId && portfolioOverdue > summary.overdue && (
          <div className="mt-1.5 text-[10px] text-ink-faint">
            Toàn danh mục còn <strong className="text-neg">{portfolioOverdue}</strong> đợt quá hạn —
            bỏ chọn khách hàng để xem hết.
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-neg" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Đợt kiểm soát quá hạn</div>
          <div className="font-mono font-bold text-base text-neg">{summary.overdue} Đợt</div>
          <div className="text-[11px] text-ink-faint">Cần tiến hành kiểm tra khẩn cấp</div>
        </div>

        <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-warn" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Đợt kiểm soát sắp tới hạn</div>
          <div className="font-mono font-bold text-base text-warn">{summary.dueSoon} Đợt</div>
          <div className="text-[11px] text-ink-faint">Cần gửi thông báo nhắc lịch</div>
        </div>

        <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Chưa tới hạn kiểm tra</div>
          <div className="font-mono font-bold text-base text-accent">{summary.upcoming} Đợt</div>
          <div className="text-[11px] text-ink-faint">Theo dõi lịch đợt định kỳ</div>
        </div>

        <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-1 relative overflow-hidden`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-pos" />
          <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Đã hoàn thành kiểm soát</div>
          <div className="font-mono font-bold text-base text-pos">{summary.done} Đợt</div>
          <div className="text-[11px] text-ink-faint">Đã ghi nhận biên bản kiểm tra</div>
        </div>
      </div>

      {/* Filter Toolbar */}
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

      {/* Control List Table */}
      <div className={`${cardBg} rounded-lg border overflow-hidden`}>
        <div className={`p-3 border-b flex items-center justify-between bg-panel-muted border-line`}>
          <span className="font-bold text-xs">
            DANH SÁCH ĐỢT KIỂM SOÁT ({filtered.length})
            {selectedCustomerId && ` · ${customerName(selectedCustomerId)}`}
          </span>
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
              columns={columns}
            />
            {filtered.length > 300 && (
              <div className="p-3 text-center text-[11px] text-ink-faint border-t border-line">
                Đang hiển thị 300 / {filtered.length} đợt. Dùng bộ lọc để thu hẹp danh sách.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Record Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-lg border shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
            <div className="p-4 border-b flex items-center justify-between border-line">
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
                <div className="rounded-md border p-3 space-y-3 bg-panel-muted border-line">
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
                        <select value={modalTenor} onChange={e => setModalTenor(parseInt(e.target.value, 10) as 6 | 12 | 24)}
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

            <div className="p-4 border-t flex items-center justify-end gap-2 border-line">
              <button type="button" onClick={closeModal}
                className="px-3 py-2 rounded-md text-xs font-semibold border border-line text-ink-muted">
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
