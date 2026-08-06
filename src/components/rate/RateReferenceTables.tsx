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
  <>
  {programFeeOptions.length > 0 && (
    <div className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
      <button
        type="button"
        onClick={() => setShowFeeTable(v => !v)}
        className="w-full p-3 flex items-center justify-between gap-2 font-bold text-xs uppercase tracking-wider text-accent hover:bg-panel-muted transition-colors"
      >
        <span>PHÍ DỊCH VỤ THEO PHƯƠNG ÁN ({programFeeOptions.length} phương án)</span>
        <span className="flex items-center gap-1 normal-case font-medium text-ink-faint">
          {showFeeTable ? 'Ẩn bảng' : 'Xem bảng'}
          {showFeeTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      <div className={`overflow-x-auto border-t border-line ${showFeeTable ? '' : 'hidden'}`}>
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-panel-muted font-bold border-b border-line">
            <tr>
              <th className="p-2.5">PHƯƠNG ÁN</th>
              <th className="p-2.5">NHÓM GÓI CỐ ĐỊNH</th>
              <th className="p-2.5 text-right">PHÍ TỐI THIỂU</th>
              <th className="p-2.5 text-right">TRONG ĐÓ TẠI QUẦY / TKSĐ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {programFeeOptions.map(o => (
              <tr key={o.Id}>
                <td className="p-2.5 font-bold">{o.OptionLabel}</td>
                <td className="p-2.5">{o.PackageGroup}</td>
                <td className="p-2.5 text-right font-mono font-bold text-accent">
                  {fmtPercent(o.MinFeeRatio)}
                </td>
                <td className="p-2.5 text-right font-mono">
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
    <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-1.5`}>
      <div className="font-bold text-xs uppercase tracking-wider text-accent border-b border-line pb-2">
        ĐIỀU KIỆN ÁP DỤNG
      </div>
      {programConditions.map(c => (
        <div key={c.Id} className="text-[11px] text-ink-muted">
          • {c.Heading && <strong>{c.Heading}: </strong>}{c.Content}
        </div>
      ))}
    </div>
  )}

  {programPrepayFees.length > 0 && (
    <div className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
      <div className="p-3 border-b border-line font-bold text-xs uppercase tracking-wider text-accent">
        PHÍ TRẢ NỢ TRƯỚC HẠN
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-panel-muted font-bold border-b border-line">
            <tr>
              <th className="p-2.5">NĂM</th>
              <th className="p-2.5 text-right">MỨC PHÍ</th>
              <th className="p-2.5">GHI CHÚ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {programPrepayFees.map(f => {
              const missing = f.FeeRatio === null || f.FeeRatio === undefined;
              return (
                <tr key={f.Id} className={missing ? 'bg-neg-soft ' : ''}>
                  <td className="p-2.5 font-mono">
                    {f.YearTo === null || f.YearTo === undefined
                      ? `Từ năm ${f.YearFrom} trở đi`
                      : f.YearFrom === f.YearTo ? `Năm ${f.YearFrom}` : `Năm ${f.YearFrom} – ${f.YearTo}`}
                  </td>
                  <td className={`p-2.5 text-right font-mono font-bold ${missing ? 'text-neg' : ''}`}>
                    {missing ? 'THIẾU SỐ' : f.FeeRatio === 0 ? 'Miễn phí' : fmtPercent(f.FeeRatio)}
                  </td>
                  <td className="p-2.5 text-ink-faint">{f.Note || ''}</td>
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
      <div className="p-3 border-b border-line font-bold text-xs uppercase tracking-wider text-accent flex items-center space-x-1.5">
        <Landmark className="w-4 h-4" />
        <span>THẨM QUYỀN ĐIỀU CHỈNH LÃI SUẤT TIỀN GỬI</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-panel-muted font-bold border-b border-line">
            <tr>
              <th className="p-2.5">THẨM QUYỀN</th>
              <th className="p-2.5">KỲ HẠN</th>
              <th className="p-2.5 text-right">HIỆN TẠI</th>
              <th className="p-2.5 text-right">ĐIỀU CHỈNH</th>
              <th className="p-2.5 text-right">+/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
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
                  <td className="p-2.5 text-right font-mono">{fmtPercent(a.CurrentRate)}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-accent">
                    {fmtPercent(a.AdjustedRate)}
                  </td>
                  <td className="p-2.5 text-right font-mono text-pos">
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
      <div className="p-3 border-b border-line font-bold text-xs uppercase tracking-wider text-accent">
        HƯỚNG DẪN NHẬP LIỆU TRÊN FBE
      </div>
      <div className="overflow-x-auto max-h-[360px]">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="sticky top-0 bg-panel-muted font-bold border-b border-line">
            <tr>
              <th className="p-2.5">ĐỐI TƯỢNG ÁP DỤNG</th>
              <th className="p-2.5 text-center">MÃ RATE ID</th>
              <th className="p-2.5">DIỄN GIẢI</th>
              <th className="p-2.5">RATE ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(['co_dinh_suot_thoi_gian_vay', 'co_dinh_ky_dau', 'data_udf'] as const).map(scope => {
              const rows = programFbeCodes.filter(c => c.Scope === scope);
              if (rows.length === 0) return null;
              return (
                <React.Fragment key={scope}>
                  <tr className="bg-panel-muted ">
                    <td colSpan={4} className="p-2 font-bold text-ink-muted">
                      {FBE_SCOPE_LABELS[scope]}
                    </td>
                  </tr>
                  {rows.map(c => (
                    <tr key={c.Id}>
                      <td className="p-2.5">{c.Applies}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-accent">
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
      <div className="p-3 border-t border-line text-[11px] text-ink-faint">
        Nhập Reset frequency: <strong>Quarterly</strong>. Reset date: gói cố định suốt thời gian vay không nhập;
        gói cố định kỳ đầu nhập ngày hết hạn áp dụng gói cố định.
      </div>
    </div>
  )}
  </>
);
