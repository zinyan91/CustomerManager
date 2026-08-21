import React from 'react';
import { fmtPercent } from '../../lib/utils';
import { CHANNEL_LABELS, PAYOUT_MODE_LABELS } from '../../lib/rateQuote';
import type {
  DepositChannel, DepositRateRow, RateProgram, RateProgramKind, RateProgramTier,
} from '../../lib/rateQuote';

interface RateTierTableProps {
  cardBg: string;
  kind: RateProgramKind;
  program: RateProgram;
  lendingTiers: RateProgramTier[];
  depositChannels: DepositChannel[];
  depositRows: DepositRateRow[];
  selectedTierId: number | null;
  setSelectedTierId: (id: number | null) => void;
}

export const RateTierTable: React.FC<RateTierTableProps> = ({
  cardBg, kind, program, lendingTiers, depositChannels, depositRows,
  selectedTierId, setSelectedTierId,
}) => (
  <div className={`${cardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden font-app animate-in fade-in duration-150`}>
    <div className="p-3.5 sm:p-4 border-b border-line/60 font-bold text-xs tracking-tight text-accent flex items-center justify-between bg-surface/75 backdrop-blur-md">
      <span className="uppercase tracking-wider text-[11px]">
        {kind === 'huy_dong' ? 'BẢNG LÃI SUẤT TIỀN GỬI' : 'BẢNG LÃI SUẤT CHO VAY'}
      </span>
      <span className="text-[10px] text-ink-faint font-normal">
        Nhấp chọn dòng để áp dụng biểu lãi suất
      </span>
    </div>
    <div className="overflow-x-auto max-h-[420px]">
      <table className="w-full text-left text-xs border-collapse font-app">
        <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
          <tr>
            <th className="px-3.5 py-2.5 w-8" />
            {kind === 'huy_dong' ? (
              <>
                <th className="px-3.5 py-2.5">BẬC SỐ DƯ / ĐIỀU KIỆN</th>
                <th className="px-3.5 py-2.5 text-center">KỲ HẠN</th>
                <th className="px-3.5 py-2.5">CÁCH TRẢ LÃI</th>
                {depositChannels.map(ch => (
                  <th key={ch} className="px-3.5 py-2.5 text-right whitespace-nowrap">
                    {CHANNEL_LABELS[ch].toUpperCase()} (%/NĂM)
                  </th>
                ))}
              </>
            ) : (
              <>
                <th className="px-3.5 py-2.5 text-center">LỰA CHỌN</th>
                <th className="px-3.5 py-2.5">GÓI CỐ ĐỊNH</th>
                <th className="px-3.5 py-2.5 text-center">TG VAY TỐI THIỂU</th>
                <th className="px-3.5 py-2.5 text-right">LSCV (%/NĂM)</th>
                <th className="px-3.5 py-2.5 text-right">PHÍ TỐI THIỂU</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/40">
          {kind === 'huy_dong' && depositRows.map(row => {
            const firstId = depositChannels
              .map(ch => row.tierIdByChannel[ch])
              .find(x => x !== undefined) ?? 0;
            const active = firstId === selectedTierId;
            return (
              <tr key={row.key}
                onClick={() => setSelectedTierId(firstId)}
                className={`cursor-pointer transition-colors ${
                  active ? 'bg-accent-soft/70 font-bold border-l-2 border-l-accent' : 'hover:bg-accent/[0.04]'
                }`}>
                <td className="px-3.5 py-2.5 text-center">
                  <input type="radio" checked={active} onChange={() => setSelectedTierId(firstId)} className="accent-accent cursor-pointer" />
                </td>
                <td className="px-3.5 py-2.5 text-ink">{row.balanceTierLabel || '—'}</td>
                <td className="px-3.5 py-2.5 text-center font-mono font-semibold text-ink-muted">
                  {row.tenorMonths ? `${row.tenorMonths} tháng` : '—'}
                </td>
                <td className="px-3.5 py-2.5 text-ink-muted">
                  {row.payoutMode ? PAYOUT_MODE_LABELS[row.payoutMode] : '—'}
                </td>
                {depositChannels.map(ch => {
                  const coKenh = ch in row.byChannel;
                  const v = row.byChannel[ch];
                  const thieu = !coKenh || v === null || v === undefined;
                  return (
                    <td key={ch} className={`px-3.5 py-2.5 text-right font-mono font-bold ${
                      thieu ? 'text-ink-faint' : 'text-accent'
                    }`}>
                      {thieu ? '—' : fmtPercent(v)}
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
                    ? 'bg-accent-soft/70 font-bold border-l-2 border-l-accent'
                    : 'hover:bg-accent/[0.04]'
                }`}
              >
                <td className="px-3.5 py-2.5 text-center">
                  <input type="radio" checked={active} onChange={() => setSelectedTierId(t.Id)} className="accent-accent cursor-pointer" />
                </td>
                <td className="px-3.5 py-2.5 text-center font-mono font-bold text-accent">{t.PackageCode || '—'}</td>
                <td className="px-3.5 py-2.5 text-ink">
                  {t.Label}
                  {t.Note && (
                    <span className="block text-[10px] text-warn font-normal mt-0.5">
                      ⚠ {t.Note}
                    </span>
                  )}
                </td>
                <td className="px-3.5 py-2.5 text-center font-mono font-semibold text-ink-muted">
                  {t.MinTenorMonths ? `${t.MinTenorMonths} tháng` : '—'}
                </td>
                <td className={`px-3.5 py-2.5 text-right font-mono font-bold ${missing ? 'text-neg' : 'text-accent'}`}>
                  {missing ? 'CHƯA CÓ' : fmtPercent(t.RateAnnual)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-mono text-ink-muted">{fmtPercent(t.MinFeeRatio)}</td>
              </tr>
            );
          })}
          {(kind === 'huy_dong' ? depositRows : lendingTiers).length === 0 && (
            <tr>
              <td colSpan={6} className="p-8 text-center text-ink-faint">
                Chương trình chưa có dòng lãi suất nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    {program.FloatingSpreadAnnual !== null && program.FloatingSpreadAnnual !== undefined && kind !== 'huy_dong' && (
      <div className="p-3.5 border-t border-line/60 text-[11px] text-ink-muted bg-surface/40">
        Sau thời gian cố định: <strong>{program.FloatingBaseLabel || 'LSCS'} + biên độ tối thiểu {fmtPercent(program.FloatingSpreadAnnual)}</strong>
        {program.RateResetMonths ? `, kỳ điều chỉnh ${program.RateResetMonths} tháng/lần.` : '.'}
      </div>
    )}
  </div>
);
