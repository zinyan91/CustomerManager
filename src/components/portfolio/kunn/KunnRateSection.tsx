import React from 'react';
import { Trash2 } from 'lucide-react';
import { DateInput } from '../../DateInput';
import { fmtDate } from '../../../lib/utils';
import type { RateAdjustmentHistoryItem } from '../../../types';
import { UI } from '../../../lib/uiClasses';

export interface KunnRateProps {
  interestRateMode: 'pref' | 'base';
  setInterestRateMode: (v: 'pref' | 'base') => void;
  ratePreferential: string;
  setRatePreferential: (v: string) => void;
  ratePreferentialMonths: string;
  setRatePreferentialMonths: (v: string) => void;
  rateBase: string;
  setRateBase: (v: string) => void;
  rateMargin: string;
  setRateMargin: (v: string) => void;
  postPrefRate: number;
  normalRate: number;
  surchargeVal: number;
  currentActiveRateDisplay: number;
  rateConditionSurcharge: string;
  setRateConditionSurcharge: (v: string) => void;
  rateFloor: string;
  setRateFloor: (v: string) => void;
  rateHistory: RateAdjustmentHistoryItem[];
  setRateHistory: (v: RateAdjustmentHistoryItem[]) => void;
}

export interface KunnAdjustmentProps {
  newAdjDate: string;
  setNewAdjDate: (v: string) => void;
  newAdjBaseRate: string;
  setNewAdjBaseRate: (v: string) => void;
  newAdjMargin: string;
  setNewAdjMargin: (v: string) => void;
  newAdjPenalty: string;
  setNewAdjPenalty: (v: string) => void;
  newAdjReason: string;
  setNewAdjReason: (v: string) => void;
}

export interface KunnRateSectionProps {
  rate: KunnRateProps;
  adjustment: KunnAdjustmentProps;
  showNotify: (type: 'success' | 'error', message: string) => void;
}

export const KunnRateSection: React.FC<KunnRateSectionProps> = ({
  rate: {
    interestRateMode,
    setInterestRateMode,
    ratePreferential,
    setRatePreferential,
    ratePreferentialMonths,
    setRatePreferentialMonths,
    rateBase,
    setRateBase,
    rateMargin,
    setRateMargin,
    postPrefRate,
    normalRate,
    surchargeVal,
    currentActiveRateDisplay,
    rateConditionSurcharge,
    setRateConditionSurcharge,
    rateFloor,
    setRateFloor,
    rateHistory,
    setRateHistory,
  },
  adjustment: {
    newAdjDate,
    setNewAdjDate,
    newAdjBaseRate,
    setNewAdjBaseRate,
    newAdjMargin,
    setNewAdjMargin,
    newAdjPenalty,
    setNewAdjPenalty,
    newAdjReason,
    setNewAdjReason,
  },
  showNotify,
}) => (
  <div className={`rounded-md p-4 space-y-3 border ${UI.sectionBoxBg}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-[11px] font-bold text-neg uppercase tracking-wider">
        CẤU TRÚC LÃI SUẤT
      </div>
      <div className="flex items-center space-x-4 text-xs font-semibold">
        <label className="flex items-center space-x-1.5 cursor-pointer">
          <input
            type="radio"
            name="rateMode"
            checked={interestRateMode === 'pref'}
            onChange={() => setInterestRateMode('pref')}
            className="w-3.5 h-3.5 text-neg "
          />
          <span>1. LS Ưu đãi & Sau ưu đãi</span>
        </label>
        <label className="flex items-center space-x-1.5 cursor-pointer">
          <input
            type="radio"
            name="rateMode"
            checked={interestRateMode === 'base'}
            onChange={() => setInterestRateMode('base')}
            className="w-3.5 h-3.5 text-neg "
          />
          <span>2. LS Thông thường (LSCS + Biên độ)</span>
        </label>
      </div>
    </div>

    {interestRateMode === 'pref' ? (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div>
          <label className={`block mb-1 ${UI.labelStyle}`}>Lãi suất ưu đãi (LSUD) %/năm</label>
          <input type="number" step="0.01" min={0} value={ratePreferential}
            onChange={e => setRatePreferential(e.target.value)}
            placeholder="7.5"
            className={`w-full rounded-md p-2.5 text-xs font-mono font-bold text-neg ${UI.inputStyle}`} />
        </div>
        <div>
          <label className={`block mb-1 ${UI.labelStyle}`}>Thời gian ưu đãi (tháng)</label>
          <input type="number" min={0} value={ratePreferentialMonths}
            onChange={e => setRatePreferentialMonths(e.target.value)}
            placeholder="6, 12..."
            className={`w-full rounded-md p-2.5 text-xs ${UI.inputStyle}`} />
        </div>
        <div>
          <label className={`block mb-1 ${UI.labelStyle}`}>Biên độ cộng thêm %/năm</label>
          <input type="number" step="0.01" value={rateMargin}
            onChange={e => setRateMargin(e.target.value)}
            placeholder="3.5"
            className={`w-full rounded-md p-2.5 text-xs font-mono font-bold text-warn ${UI.inputStyle}`} />
        </div>
        <div className={`col-span-full space-y-2 p-3 rounded-md border ${'bg-accent-soft border-accent/30'
          }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={UI.labelStyle}>Lãi suất sau ưu đãi:</span>
            <span className="font-mono font-bold text-warn text-sm">{postPrefRate.toFixed(2)} %/năm</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-accent/30 ">
            <span className="font-bold text-accent ">LÃI SUẤT ÁP DỤNG (KÈM PHẠT {surchargeVal > 0 ? `+${surchargeVal}%` : '0%'}):</span>
            <span className="font-mono font-bold text-neg text-sm">
              {currentActiveRateDisplay.toFixed(2)} %/năm
            </span>
          </div>
        </div>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div>
          <label className={`block mb-1 ${UI.labelStyle}`}>Lãi suất cơ sở (LSCS) %/năm</label>
          <input type="number" step="0.01" min={0} value={rateBase}
            onChange={e => setRateBase(e.target.value)}
            placeholder="8.5"
            className={`w-full rounded-md p-2.5 text-xs font-mono font-bold text-neg ${UI.inputStyle}`} />
        </div>
        <div>
          <label className={`block mb-1 ${UI.labelStyle}`}>Biên độ cộng thêm %/năm</label>
          <input type="number" step="0.01" value={rateMargin}
            onChange={e => setRateMargin(e.target.value)}
            placeholder="3.5"
            className={`w-full rounded-md p-2.5 text-xs font-mono font-bold text-warn ${UI.inputStyle}`} />
        </div>
        <div className={`col-span-full space-y-2 p-3 rounded-md border ${'bg-accent-soft border-accent/30'
          }`}>
          <div className="flex items-center justify-between text-xs">
            <span className={UI.labelStyle}>Lãi suất thông thường chuẩn (LSCS + Biên độ):</span>
            <span className="font-mono font-bold text-warn text-sm">{normalRate.toFixed(2)} %/năm</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t border-accent/30 ">
            <span className="font-bold text-accent ">LÃI SUẤT ÁP DỤNG THỰC TẾ (LSCS + BIÊN ĐỘ + PHẠT {surchargeVal > 0 ? `+${surchargeVal}%` : '0%'}):</span>
            <span className="font-mono font-bold text-neg text-sm">
              {currentActiveRateDisplay.toFixed(2)} %/năm
            </span>
          </div>
        </div>
      </div>
    )}

    <div className="pt-3 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>Phạt cộng thêm do vi phạm điều kiện (+%/năm)</label>
        <input type="number" step="0.1" min={0} value={rateConditionSurcharge}
          onChange={e => setRateConditionSurcharge(e.target.value)}
          placeholder="0.5 (%/năm)..."
          className={`w-full rounded-md p-2.5 text-xs font-mono font-bold text-neg ${UI.inputStyle}`} />
      </div>
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>Sàn lãi suất theo hợp đồng (%/năm)</label>
        <input type="number" step="0.01" min={0} value={rateFloor}
          onChange={e => setRateFloor(e.target.value)}
          placeholder="Bỏ trống nếu hợp đồng không quy định"
          className={`w-full rounded-md p-2.5 text-xs font-mono font-bold ${UI.inputStyle}`} />
        <div className="mt-1 text-[11px] text-ink-faint">
          Chặn lãi thả nổi không tụt dưới mức này khi biên độ âm
        </div>
      </div>
      <div>
        <label className={`block mb-1 ${UI.labelStyle}`}>Điều kiện phê duyệt (CASA / BCTC)</label>
        <div className="text-xs p-2.5 rounded-md border bg-warn-soft  border-warn/30  text-warn font-medium">
        </div>
      </div>
    </div>

    <div className="pt-3 border-t border-line space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-accent text-xs uppercase flex items-center space-x-1.5">
          <span>LỊCH SỬ ĐIỀU CHỈNH LÃI SUẤT</span>
        </div>
        <span className="text-[11px] text-ink-faint font-mono">
          {rateHistory.length} đợt điều chỉnh đã lưu
        </span>
      </div>

      {rateHistory.length > 0 && (
        <div className="border rounded-md overflow-hidden border-line">
          <table className="w-full text-left text-xs">
            <thead className={UI.tableHeaderStyle}>
              <tr>
                <th className="px-[var(--row-px)] py-[var(--row-py)]">STT</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)]">NGÀY HẠN HIỆU LỰC</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">LSCS (%)</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">BIÊN ĐỘ (%)</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">PHẠT (%)</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-right">LÃI SUẤT ÁP DỤNG (%/NĂM)</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)]">NỘI DUNG / LÝ DO ĐIỀU CHỈNH</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center">XÓA</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${'divide-line'}`}>
              {rateHistory.map((item, idx) => (
                <tr key={item.id} className="hover:bg-panel-muted ">
                  <td className="px-[var(--row-px)] py-[var(--row-py)] font-bold text-center">{idx + 1}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] font-mono font-bold text-accent">{fmtDate(item.effectiveDate)}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono">{item.baseRatePercent ? `${item.baseRatePercent}%` : '—'}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono">{item.marginPercent ? `+${item.marginPercent}%` : '—'}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono text-neg font-bold">{item.penaltyPercent ? `+${item.penaltyPercent}%` : '0%'}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-right font-mono font-extrabold text-neg text-sm">
                    {item.ratePercent.toFixed(2)} %/năm
                  </td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-ink-muted font-medium">{item.reason || 'Điều chỉnh LSCS'}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-center">
                    <button type="button" onClick={() => setRateHistory(rateHistory.filter(h => h.id !== item.id))}
                      className="text-neg hover:text-neg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-3 rounded-md border border-accent/30  bg-accent-soft  space-y-3">
        <div className="font-bold text-accent  text-xs">
          + THÊM ĐỢT ĐIỀU CHỈNH LÃI SUẤT MỚI (KHI NGÂN HÀNG THAY ĐỔI LSCS / THẢ NỔI):
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          <div>
            <label className={`block mb-1 ${UI.labelStyle}`}>Ngày hiệu lực *</label>
            <DateInput value={newAdjDate} onChange={setNewAdjDate} className={`w-full rounded-md p-2 ${UI.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${UI.labelStyle}`}>LSCS (%)</label>
            <input type="number" step="0.01" value={newAdjBaseRate} onChange={e => setNewAdjBaseRate(e.target.value)} placeholder="9.2" className={`w-full rounded-md p-2 font-mono ${UI.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${UI.labelStyle}`}>Biên độ (%)</label>
            <input type="number" step="0.01" value={newAdjMargin} onChange={e => setNewAdjMargin(e.target.value)} placeholder="1.35" className={`w-full rounded-md p-2 font-mono ${UI.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${UI.labelStyle}`}>Phạt vi phạm (%)</label>
            <input type="number" step="0.1" value={newAdjPenalty} onChange={e => setNewAdjPenalty(e.target.value)} placeholder="0.5" className={`w-full rounded-md p-2 font-mono ${UI.inputStyle}`} />
          </div>
          <div>
            <label className={`block mb-1 ${UI.labelStyle}`}>Lý do / Nội dung</label>
            <input type="text" value={newAdjReason} onChange={e => setNewAdjReason(e.target.value)} placeholder="Tăng LSCS T1/2027..." className={`w-full rounded-md p-2 ${UI.inputStyle}`} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={() => {
            if (!newAdjDate) {
              showNotify('error', 'Vui lòng chọn Ngày áp dụng hiệu lực!');
              return;
            }
            const b = parseFloat(newAdjBaseRate) || 0;
            const numOr = (a: string, b: string) => {
              const x = parseFloat(a);
              if (!Number.isNaN(x)) return x;
              const y = parseFloat(b);
              return Number.isNaN(y) ? 0 : y;
            };
            const m = numOr(newAdjMargin, rateMargin);
            const p = numOr(newAdjPenalty, rateConditionSurcharge);
            const totalRate = b > 0 ? (b + m + p) : (parseFloat(newAdjBaseRate) || currentActiveRateDisplay);
            if (totalRate <= 0) {
              showNotify('error', 'Vui lòng nhập Lãi suất cơ sở hoặc Lãi suất áp dụng!');
              return;
            }
            const newRecord: RateAdjustmentHistoryItem = {
              id: Date.now().toString(),
              effectiveDate: newAdjDate,
              baseRatePercent: b > 0 ? b : undefined,
              marginPercent: m > 0 ? m : undefined,
              penaltyPercent: p > 0 ? p : undefined,
              ratePercent: totalRate,
              reason: newAdjReason.trim() || 'Điều chỉnh lãi suất kỳ hạn'
            };
            const next = [...rateHistory, newRecord].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
            setRateHistory(next);
            setNewAdjDate('');
            setNewAdjBaseRate('');
            setNewAdjMargin('');
            setNewAdjPenalty('');
            setNewAdjReason('');
            showNotify('success', `Đã thêm đợt điều chỉnh LS ${totalRate.toFixed(2)}%/năm từ ngày ${fmtDate(newAdjDate)}`);
          }} className="bg-accent hover:opacity-90 text-accent-ink font-bold px-3.5 py-1.5 rounded-md text-xs flex items-center space-x-1.5">
            <span>+ Thêm đợt điều chỉnh LS này</span>
          </button>
        </div>
      </div>
    </div>
  </div>

);
