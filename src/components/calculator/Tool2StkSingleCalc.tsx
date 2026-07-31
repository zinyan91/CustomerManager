import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import type { ThemeStyles } from '../../lib/themeStyles';
import { DateInput } from '../DateInput';
import { fmtDate } from '../../lib/utils';

function addMonths(dateStr: string, months: number): string {
  if (!dateStr || !months || isNaN(months) || months <= 0) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    let targetY = y + Math.floor((m + months) / 12);
    let targetM = (m + months) % 12;
    if (targetM < 0) { targetM += 12; targetY -= 1; }

    const daysInTargetMonth = new Date(targetY, targetM + 1, 0).getDate();
    const targetD = Math.min(d, daysInTargetMonth);

    const mm = String(targetM + 1).padStart(2, '0');
    const dd = String(targetD).padStart(2, '0');
    return `${targetY}-${mm}-${dd}`;
  } catch {
    return '';
  }
}

function diffDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  try {
    const p1 = startDateStr.split('-');
    const p2 = endDateStr.split('-');
    if (p1.length !== 3 || p2.length !== 3) return 0;
    const d1 = new Date(parseInt(p1[0]), parseInt(p1[1]) - 1, parseInt(p1[2]));
    const d2 = new Date(parseInt(p2[0]), parseInt(p2[1]) - 1, parseInt(p2[2]));
    const diff = d2.getTime() - d1.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  } catch {
    return 0;
  }
}

interface Tool2StkSingleCalcProps {
  styles: ThemeStyles;
}

export const Tool2StkSingleCalc: React.FC<Tool2StkSingleCalcProps> = ({ styles }) => {
  const [depositAmountStr, setDepositAmountStr] = useState('200.000.000');
  const [interestRateStr, setInterestRateStr] = useState('5.5');
  const [tenorMonths, setTenorMonths] = useState<number>(6);
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().split('T')[0]);

  const principalAmt = parseFloat(depositAmountStr.replace(/\D/g, '')) || 0;
  const rateAnnual = parseFloat(interestRateStr) || 0;

  const dueDate = addMonths(depositDate, tenorMonths);
  const daysInTerm = diffDays(depositDate, dueDate);
  const interestAmount = Math.round(principalAmt * (rateAnnual / 100) * (daysInTerm / 365));
  const totalMaturityAmt = principalAmt + interestAmount;

  return (
    <div className="space-y-4">
      <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4`}>
        <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-slate-800">
          <Layers className="w-4 h-4" />
          <span>THÔNG SỐ CẦM CỐ SỔ TIẾT KIỆM (STK) ĐƠN LẺ</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Số tiền gửi ban đầu (VNĐ) *</label>
            <input
              type="text"
              value={depositAmountStr}
              onChange={e => {
                const digits = e.target.value.replace(/\D/g, '');
                setDepositAmountStr(digits ? Number(digits).toLocaleString('vi-VN') : '');
              }}
              className={`w-full rounded-xl p-2.5 font-mono font-bold text-sky-600 dark:text-sky-400 ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Lãi suất huy động (%/năm) *</label>
            <input
              type="text"
              value={interestRateStr}
              onChange={e => setInterestRateStr(e.target.value)}
              className={`w-full rounded-xl p-2.5 font-mono font-bold ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Kỳ hạn gửi (Tháng) *</label>
            <input
              type="number"
              min={1}
              max={60}
              value={tenorMonths}
              onChange={e => setTenorMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className={`w-full rounded-xl p-2.5 font-mono font-bold ${styles.inputStyle}`}
            />
          </div>
          <div>
            <label className={`block mb-1 ${styles.labelStyle}`}>Ngày phát hành sổ (Gửi) *</label>
            <DateInput
              value={depositDate}
              onChange={val => setDepositDate(val)}
              className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
            />
          </div>
        </div>

        {/* Results Banner */}
        <div className={`p-4 rounded-xl border grid grid-cols-1 md:grid-cols-4 gap-4 ${styles.sectionBoxBg}`}>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Ngày đáo hạn dự kiến</div>
            <div className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400 mt-1">
              {dueDate ? fmtDate(dueDate) : '—'} ({daysInTerm} ngày)
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Gốc ban đầu</div>
            <div className="text-sm font-mono font-bold text-sky-600 dark:text-sky-400 mt-1">
              {principalAmt.toLocaleString('vi-VN')} VNĐ
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Tổng tiền lãi thực nhận</div>
            <div className="text-sm font-mono font-bold text-amber-600 dark:text-amber-400 mt-1">
              +{interestAmount.toLocaleString('vi-VN')} VNĐ
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 uppercase font-semibold">Tổng giá trị khi đáo hạn</div>
            <div className="text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {totalMaturityAmt.toLocaleString('vi-VN')} VNĐ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
