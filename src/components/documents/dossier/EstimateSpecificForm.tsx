import React, { useMemo } from 'react';
import { Calculator, Plus, Trash2, Building, Hammer, Home, Store } from 'lucide-react';
import type { DossierCommon } from '../registry/types';
import type { EstimateSpecific } from '../registry/templates/constEstimate';
import { ESTIMATE_PRESETS, type EstimateItem } from '../../../lib/estimateExport';

const INPUT = 'w-full rounded-xl p-2.5 border border-line/70 bg-surface/80 focus:border-accent text-xs';
const LABEL = 'block mb-1 text-[11px] font-semibold text-ink-muted';

export interface EstimateSpecificFormProps {
  common: DossierCommon;
  specific: EstimateSpecific;
  patch: (p: Partial<EstimateSpecific>) => void;
  patchCommon?: (p: Partial<DossierCommon>) => void;
}

export const EstimateSpecificForm: React.FC<EstimateSpecificFormProps> = ({
  common,
  specific,
  patch,
  patchCommon,
}) => {
  const currentItems = useMemo(() => {
    const raw = common?.items && common.items.length > 0
      ? common.items
      : ESTIMATE_PRESETS.sua_chua_nha.items;
    return raw.map((it: any, idx: number) => ({
      id: String(it.id || idx + 1),
      name: it.name || '',
      unit: it.unit || 'm²',
      quantity: Number(it.quantity) || 0,
      price: Number(it.price) || 0,
      note: it.note || '',
    }));
  }, [common?.items]);

  const totalCalculated = useMemo(() => {
    return currentItems.reduce((sum, it) => sum + (it.quantity * it.price), 0);
  }, [currentItems]);

  const loanAmount = specific.loanAmount !== undefined && specific.loanAmount > 0
    ? specific.loanAmount
    : Math.round(totalCalculated * 0.8);

  const ownCapital = Math.max(0, totalCalculated - loanAmount);
  const loanPct = totalCalculated > 0 ? ((loanAmount / totalCalculated) * 100).toFixed(2) : '0.00';
  const ownPct = totalCalculated > 0 ? ((ownCapital / totalCalculated) * 100).toFixed(2) : '0.00';

  const handleApplyPreset = (presetKey: keyof typeof ESTIMATE_PRESETS) => {
    const preset = ESTIMATE_PRESETS[presetKey];
    if (!preset) return;

    const presetTotal = preset.items.reduce((s, i) => s + (i.quantity * i.price), 0);

    if (patchCommon) {
      patchCommon({
        items: preset.items,
        totalAmount: presetTotal.toLocaleString('vi-VN'),
      });
    }

    patch({
      sheetTitle: preset.title,
      loanAmount: preset.loanAmount,
      unitPrice: preset.unitPrice,
    });
  };

  const handleItemChange = (idx: number, field: keyof EstimateItem, value: any) => {
    const updated = [...currentItems];
    updated[idx] = {
      ...updated[idx],
      [field]: field === 'quantity' || field === 'price' ? Number(value) || 0 : value,
    };
    if (patchCommon) {
      const newTotal = updated.reduce((s, i) => s + (i.quantity * i.price), 0);
      patchCommon({
        items: updated,
        totalAmount: newTotal.toLocaleString('vi-VN'),
      });
    }
  };

  const handleAddItem = () => {
    const newItem: EstimateItem = {
      id: String(Date.now()),
      name: 'Hạng mục mới',
      unit: 'm²',
      quantity: 1,
      price: 1000000,
      note: '',
    };
    const updated = [...currentItems, newItem];
    if (patchCommon) {
      const newTotal = updated.reduce((s, i) => s + (i.quantity * i.price), 0);
      patchCommon({
        items: updated,
        totalAmount: newTotal.toLocaleString('vi-VN'),
      });
    }
  };

  const handleRemoveItem = (idx: number) => {
    const updated = currentItems.filter((_, i) => i !== idx);
    if (patchCommon) {
      const newTotal = updated.reduce((s, i) => s + (i.quantity * i.price), 0);
      patchCommon({
        items: updated,
        totalAmount: newTotal.toLocaleString('vi-VN'),
      });
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Bộ chọn mẫu dự toán gốc */}
      <div className="p-3 rounded-xl border border-line/70 bg-surface/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-accent uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Calculator size={14} />
            <span>Nạp mẫu dự toán gốc (từ file Excel)</span>
          </span>
          <span className="text-[10px] text-ink-muted">4 Mẫu thực tế</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleApplyPreset('sua_chua_nha')}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-line/80 bg-surface hover:bg-accent/10 hover:border-accent text-ink text-[11px] font-semibold transition-all cursor-pointer"
            title="Sửa chữa nhà - 19 hạng mục - 1.078.500.000đ"
          >
            <Hammer size={12} className="text-accent" />
            <span className="truncate">Sửa chữa nhà</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('xay_nha_moi')}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-line/80 bg-surface hover:bg-accent/10 hover:border-accent text-ink text-[11px] font-semibold transition-all cursor-pointer"
            title="Xây nhà mới - 29 hạng mục - 1.239.250.000đ"
          >
            <Building size={12} className="text-pos" />
            <span className="truncate">Xây nhà mới</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('tan_ngoc')}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-line/80 bg-surface hover:bg-accent/10 hover:border-accent text-ink text-[11px] font-semibold transition-all cursor-pointer"
            title="Tấn Ngọc (Cải tạo KD) - 17 hạng mục - 3.226.500.000đ"
          >
            <Store size={12} className="text-warn" />
            <span className="truncate">Tấn Ngọc</span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset('nha_tro')}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-line/80 bg-surface hover:bg-accent/10 hover:border-accent text-ink text-[11px] font-semibold transition-all cursor-pointer"
            title="Nhà trọ - 13 hạng mục - 2.350.750.000đ"
          >
            <Home size={12} className="text-info" />
            <span className="truncate">Nhà trọ</span>
          </button>
        </div>
      </div>

      {/* Thông tin tiêu đề & tài chính */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className={LABEL}>Tiêu đề bảng dự toán</label>
          <input
            className={INPUT}
            value={specific.sheetTitle || 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT'}
            onChange={e => patch({ sheetTitle: e.target.value })}
            placeholder="BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL}>Khổ giấy xem trước & in ấn</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => patch({ orientation: 'landscape' })}
              className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                (specific.orientation || 'landscape') === 'landscape'
                  ? 'bg-accent/15 border-accent text-accent font-bold shadow-2xs'
                  : 'bg-surface border-line/70 text-ink-muted hover:bg-surface-elevated'
              }`}
            >
              Khổ ngang (A4 Landscape - Chuẩn Excel)
            </button>
            <button
              type="button"
              onClick={() => patch({ orientation: 'portrait' })}
              className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                specific.orientation === 'portrait'
                  ? 'bg-accent/15 border-accent text-accent font-bold shadow-2xs'
                  : 'bg-surface border-line/70 text-ink-muted hover:bg-surface-elevated'
              }`}
            >
              Khổ dọc (A4 Portrait)
            </button>
          </div>
        </div>

        <div>
          <label className={LABEL}>Vốn đề nghị vay (VNĐ)</label>
          <input
            type="number"
            className={`${INPUT} font-bold text-ink`}
            value={loanAmount}
            onChange={e => patch({ loanAmount: Number(e.target.value) || 0 })}
            placeholder="960000000"
          />
        </div>

        <div>
          <label className={LABEL}>Đơn giá (VNĐ/m² - để 0 nếu không áp dụng)</label>
          <input
            type="number"
            className={INPUT}
            value={specific.unitPrice ?? 6000000}
            onChange={e => patch({ unitPrice: Number(e.target.value) || 0 })}
            placeholder="6000000"
          />
        </div>

        <div>
          <label className={LABEL}>Chức danh ký duyệt</label>
          <input
            className={INPUT}
            value={specific.creatorTitle || 'Người lập'}
            onChange={e => patch({ creatorTitle: e.target.value })}
            placeholder="Người lập"
          />
        </div>

        <div>
          <label className={LABEL}>Họ tên người lập (để trống nếu ký chay)</label>
          <input
            className={INPUT}
            value={specific.creatorName || ''}
            onChange={e => patch({ creatorName: e.target.value })}
            placeholder="Nguyễn Văn A"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL}>Địa điểm thi công / Công trình</label>
          <input
            className={INPUT}
            value={specific.siteAddress || ''}
            onChange={e => patch({ siteAddress: e.target.value })}
            placeholder="Địa chỉ công trình sửa chữa / xây dựng..."
          />
        </div>
      </div>

      {/* Thẻ tổng kết tài chính sống */}
      <div className="p-3 rounded-xl border border-line/80 bg-surface-elevated/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-lg bg-surface/60 border border-line/40">
          <span className="text-[10px] text-ink-muted block uppercase">Tổng cộng</span>
          <span className="font-bold text-xs text-ink">{totalCalculated.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="p-2 rounded-lg bg-surface/60 border border-line/40">
          <span className="text-[10px] text-ink-muted block uppercase">Vốn vay ({loanPct}%)</span>
          <span className="font-bold text-xs text-pos">{loanAmount.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="p-2 rounded-lg bg-surface/60 border border-line/40">
          <span className="text-[10px] text-ink-muted block uppercase">Vốn tự có ({ownPct}%)</span>
          <span className="font-bold text-xs text-ink">{ownCapital.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="p-2 rounded-lg bg-surface/60 border border-line/40">
          <span className="text-[10px] text-ink-muted block uppercase">Đơn giá m²</span>
          <span className="font-bold text-xs text-accent">
            {specific.unitPrice && specific.unitPrice > 0 ? `${specific.unitPrice.toLocaleString('vi-VN')} đ` : '—'}
          </span>
        </div>
      </div>

      {/* Bảng danh mục hạng mục công việc */}
      <div className="border rounded-xl overflow-hidden border-line/70 bg-surface/60">
        <div className="p-2.5 bg-surface border-b border-line/70 flex items-center justify-between">
          <span className="font-bold text-[11px] text-accent uppercase tracking-wider">
            Danh mục hạng mục ({currentItems.length} mục)
          </span>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1 bg-accent hover:opacity-90 text-accent-ink px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Plus size={13} />
            <span>Thêm mục</span>
          </button>
        </div>

        <div className="max-h-[380px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-line/80 text-[10px] uppercase font-bold text-ink-faint">
              <tr>
                <th className="px-1.5 py-1.5 text-center w-8">STT</th>
                <th className="px-2 py-1.5">Hạng mục công việc</th>
                <th className="px-1.5 py-1.5 text-center w-14">ĐVT</th>
                <th className="px-1.5 py-1.5 text-right w-14">SL</th>
                <th className="px-1.5 py-1.5 text-right w-20">Đơn giá</th>
                <th className="px-1.5 py-1.5 text-right w-24">Thành tiền</th>
                <th className="px-2 py-1.5">Ghi chú</th>
                <th className="px-1 py-1.5 text-center w-7">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {currentItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-panel-muted/30">
                  <td className="px-1.5 py-1.5 text-center font-bold text-ink-muted">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleItemChange(idx, 'name', e.target.value)}
                      className="w-full rounded p-1 border border-line/60 bg-surface text-xs"
                    />
                  </td>
                  <td className="px-1.5 py-1.5 text-center">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full rounded p-1 border border-line/60 bg-surface text-xs text-center"
                    />
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    <input
                      type="number"
                      step="any"
                      value={item.quantity}
                      onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full rounded p-1 border border-line/60 bg-surface text-xs text-right font-medium"
                    />
                  </td>
                  <td className="px-1.5 py-1.5 text-right">
                    <input
                      type="number"
                      value={item.price}
                      onChange={e => handleItemChange(idx, 'price', e.target.value)}
                      className="w-full rounded p-1 border border-line/60 bg-surface text-xs text-right font-medium"
                    />
                  </td>
                  <td className="px-1.5 py-1.5 text-right font-bold text-ink whitespace-nowrap">
                    {(item.quantity * item.price).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={item.note || ''}
                      onChange={e => handleItemChange(idx, 'note', e.target.value)}
                      className="w-full rounded p-1 border border-line/60 bg-surface text-xs"
                    />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-neg/80 hover:text-neg p-1 rounded hover:bg-neg/10 cursor-pointer"
                      title="Xóa hạng mục này"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
