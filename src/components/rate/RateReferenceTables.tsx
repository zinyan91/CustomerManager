import React from 'react';
import { ChevronDown, ChevronUp, Landmark } from 'lucide-react';
import { fmtPercent } from '../../lib/utils';
import { FBE_SCOPE_LABELS } from '../../lib/rateQuote';
import type {
  DepositRateAuthority, RateProgramCondition, RateProgramFbeCode,
  RateProgramFeeOption, RateProgramPrepaymentFee,
} from '../../lib/rateQuote';

interface RateReferenceTablesProps {
  cardBg: string;
  programFeeOptions: RateProgramFeeOption[];
  programConditions: RateProgramCondition[];
  programPrepayFees: RateProgramPrepaymentFee[];
  programAuthorities: DepositRateAuthority[];
  programFbeCodes: RateProgramFbeCode[];
  showFeeTable: boolean;
  setShowFeeTable: React.Dispatch<React.SetStateAction<boolean>>;
}

export const RateReferenceTables: React.FC<RateReferenceTablesProps> = ({
  cardBg, programFeeOptions, programConditions, programPrepayFees,
  programAuthorities, programFbeCodes, showFeeTable, setShowFeeTable,
}) => (
  <div className="space-y-4 font-app">
  {programFeeOptions.length > 0 && (
    <div className={`${cardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden animate-in fade-in duration-150`}>
      <button
        type="button"
        onClick={() => setShowFeeTable(v => !v)}
        className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-2 font-bold text-xs tracking-tight text-accent hover:bg-surface/60 transition-colors cursor-pointer bg-surface/75 backdrop-blur-md"
      >
        <span className="uppercase tracking-wider text-[11px]">PHÍ DỊCH VỤ THEO PHƯƠNG ÁN ({programFeeOptions.length} PHƯƠNG ÁN)</span>
        <span className="flex items-center gap-1 normal-case font-medium text-ink-faint text-xs">
          {showFeeTable ? 'Ẩn bảng' : 'Xem bảng'}
          {showFeeTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      <div className={`overflow-x-auto border-t border-line/60 ${showFeeTable ? '' : 'hidden'}`}>
        <table className="w-full text-left text-xs border-collapse font-app">
          <thead className="bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
            <tr>
              <th className="px-3.5 py-2.5">PHƯƠNG ÁN</th>
              <th className="px-3.5 py-2.5">NHÓM GÓI CỐ ĐỊNH</th>
              <th className="px-3.5 py-2.5 text-right">PHÍ TỐI THIỂU</th>
              <th className="px-3.5 py-2.5 text-right">TRONG ĐÓ TẠI QUẦY / TKSĐ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {programFeeOptions.map(o => (
              <tr key={o.Id} className="hover:bg-accent/[0.04] transition-colors">
                <td className="px-3.5 py-2.5 font-bold text-ink">{o.OptionLabel}</td>
                <td className="px-3.5 py-2.5 text-ink-muted">{o.PackageGroup}</td>
                <td className="px-3.5 py-2.5 text-right font-mono font-bold text-accent">
                  {fmtPercent(o.MinFeeRatio)}
                </td>
                <td className="px-3.5 py-2.5 text-right font-mono text-ink-muted">
                  {o.CounterFeeRatio === null || o.CounterFeeRatio === undefined
                    ? '—' : fmtPercent(o.CounterFeeRatio)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {programConditions.length > 0 && (
    <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-2 animate-in fade-in duration-150`}>
      <div className="font-bold text-xs tracking-tight text-accent border-b border-line/60 pb-2.5 uppercase tracking-wider">
        ĐIỀU KIỆN ÁP DỤNG
      </div>
      <div className="space-y-1.5 pt-1">
        {programConditions.map(c => (
          <div key={c.Id} className="text-xs text-ink-muted leading-relaxed">
            • {c.Heading && <strong className="text-ink">{c.Heading}: </strong>}{c.Content}
          </div>
        ))}
      </div>
    </div>
  )}

  {programPrepayFees.length > 0 && (
    <div className={`${cardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden animate-in fade-in duration-150`}>
      <div className="p-3.5 sm:p-4 border-b border-line/60 font-bold text-xs tracking-tight text-accent uppercase tracking-wider bg-surface/75 backdrop-blur-md">
        PHÍ TRẢ NỢ TRƯỚC HẠN
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-app">
          <thead className="bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
            <tr>
              <th className="px-3.5 py-2.5">NĂM</th>
              <th className="px-3.5 py-2.5 text-right">MỨC PHÍ</th>
              <th className="px-3.5 py-2.5">GHI CHÚ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {programPrepayFees.map(f => {
              const missing = f.FeeRatio === null || f.FeeRatio === undefined;
              return (
                <tr key={f.Id} className={`hover:bg-accent/[0.04] transition-colors ${missing ? 'bg-neg-soft/30' : ''}`}>
                  <td className="px-3.5 py-2.5 font-mono text-ink">
                    {f.YearTo === null || f.YearTo === undefined
                      ? `Từ năm ${f.YearFrom} trở đi`
                      : f.YearFrom === f.YearTo ? `Năm ${f.YearFrom}` : `Năm ${f.YearFrom} – ${f.YearTo}`}
                  </td>
                  <td className={`px-3.5 py-2.5 text-right font-mono font-bold ${missing ? 'text-neg' : 'text-accent'}`}>
                    {missing ? 'THIẾU SỐ' : f.FeeRatio === 0 ? 'Miễn phí' : fmtPercent(f.FeeRatio)}
                  </td>
                  <td className="px-3.5 py-2.5 text-ink-faint text-[11px]">{f.Note || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  )}

  {programAuthorities.length > 0 && (
    <div className={`${cardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden animate-in fade-in duration-150`}>
      <div className="p-3.5 sm:p-4 border-b border-line/60 font-bold text-xs tracking-tight text-accent flex items-center space-x-2 bg-surface/75 backdrop-blur-md">
        <div className="p-1 rounded-lg bg-accent-soft text-accent shrink-0">
          <Landmark className="w-4 h-4" />
        </div>
        <span className="uppercase tracking-wider text-[11px]">THẨM QUYỀN ĐIỀU CHỈNH LÃI SUẤT TIỀN GỬI</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-app">
          <thead className="bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
            <tr>
              <th className="px-3.5 py-2.5">THẨM QUYỀN</th>
              <th className="px-3.5 py-2.5">KỲ HẠN</th>
              <th className="px-3.5 py-2.5 text-right">HIỆN TẠI</th>
              <th className="px-3.5 py-2.5 text-right">ĐIỀU CHỈNH</th>
              <th className="px-3.5 py-2.5 text-right">+/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {programAuthorities.map(a => {
              const delta =
                a.CurrentRate !== null && a.CurrentRate !== undefined
                && a.AdjustedRate !== null && a.AdjustedRate !== undefined
                  ? a.AdjustedRate - a.CurrentRate
                  : null;
              return (
                <tr key={a.Id} className="hover:bg-accent/[0.04] transition-colors">
                  <td className="px-3.5 py-2.5 font-bold text-ink">{a.AuthorityLevel}</td>
                  <td className="px-3.5 py-2.5 text-ink-muted">{a.TenorLabel}</td>
                  <td className="px-3.5 py-2.5 text-right font-mono text-ink-faint">{fmtPercent(a.CurrentRate)}</td>
                  <td className="px-3.5 py-2.5 text-right font-mono font-bold text-accent">
                    {fmtPercent(a.AdjustedRate)}
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-mono text-pos font-bold">
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
    <div className={`${cardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden animate-in fade-in duration-150`}>
      <div className="p-3.5 sm:p-4 border-b border-line/60 font-bold text-xs tracking-tight text-accent uppercase tracking-wider bg-surface/75 backdrop-blur-md">
        HƯỚNG DẪN NHẬP LIỆU TRÊN FBE
      </div>
      <div className="overflow-x-auto max-h-[360px]">
        <table className="w-full text-left text-xs border-collapse font-app">
          <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
            <tr>
              <th className="px-3.5 py-2.5">ĐỐI TƯỢNG ÁP DỤNG</th>
              <th className="px-3.5 py-2.5 text-center">MÃ RATE ID</th>
              <th className="px-3.5 py-2.5">DIỄN GIẢI</th>
              <th className="px-3.5 py-2.5">RATE ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {(['co_dinh_suot_thoi_gian_vay', 'co_dinh_ky_dau', 'data_udf'] as const).map(scope => {
              const rows = programFbeCodes.filter(c => c.Scope === scope);
              if (rows.length === 0) return null;
              return (
                <React.Fragment key={scope}>
                  <tr className="bg-surface/80">
                    <td colSpan={4} className="px-3.5 py-2 font-bold text-accent text-[11px] uppercase tracking-wider">
                      {FBE_SCOPE_LABELS[scope]}
                    </td>
                  </tr>
                  {rows.map(c => (
                    <tr key={c.Id} className="hover:bg-accent/[0.04] transition-colors">
                      <td className="px-3.5 py-2.5 text-ink">{c.Applies}</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-accent">
                        {c.RateIdCode || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-ink-muted">{c.Description || '—'}</td>
                      <td className="px-3.5 py-2.5 text-ink-muted">{c.RateIdValue || '—'}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-3.5 border-t border-line/60 text-[11px] text-ink-muted bg-surface/40 leading-relaxed">
        Nhập Reset frequency: <strong>Quarterly</strong>. Reset date: gói cố định suốt thời gian vay không nhập;
        gói cố định kỳ đầu nhập ngày hết hạn áp dụng gói cố định.
      </div>
    </div>
  )}
  </div>
);
