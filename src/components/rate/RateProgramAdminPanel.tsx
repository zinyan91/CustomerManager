import React from 'react';
import { CalendarClock, Copy, Loader2, Save } from 'lucide-react';
import { DateInput } from '../DateInput';
import { fmtDate } from '../../lib/utils';
import type { RateProgram, RateProgramKind } from '../../lib/rateQuote';
import { useRateProgramAdmin } from '../../hooks/useRateProgramAdmin';

interface RateProgramAdminPanelProps {
  cardBg: string;
  labelCls: string;
  inputCls: string;
  programs: RateProgram[];
  kind: RateProgramKind;
  activeProgram: RateProgram | null;
  reload: () => Promise<void> | void;
}

export const RateProgramAdminPanel: React.FC<RateProgramAdminPanelProps> = ({
  cardBg, labelCls, inputCls, programs, kind, activeProgram, reload,
}) => {
  const a = useRateProgramAdmin({ programs, kind, activeProgram, reload });

  return (
    <div className={`${cardBg} rounded-lg p-4 border space-y-4`}>
      <div className="font-bold text-xs tracking-tight text-accent border-b border-line pb-2">
        QUẢN TRỊ CHƯƠNG TRÌNH (CHỈ ADMIN)
      </div>

      {a.kindPrograms.length === 0 ? (
        <div className="text-xs text-ink-muted">
          Chưa có chương trình nào thuộc nhóm này. Chương trình đầu tiên phải nạp bằng migration SQL vì cần đối chiếu văn bản gốc từng dòng.
        </div>
      ) : (
        <>
          <div>
            <label className={labelCls}>Chương trình</label>
            <select
              value={a.sourceId ?? ''}
              onChange={e => a.setSourceId(parseInt(e.target.value, 10))}
              className={`${inputCls} font-bold`}
            >
              {a.kindPrograms.map(p => (
                <option key={p.Id} value={p.Id}>
                  {p.DocumentNumber} — {fmtDate(p.EffectiveFrom)} → {p.EffectiveTo ? fmtDate(p.EffectiveTo) : 'không giới hạn'}
                  {p.SourceVerified ? '' : ' (chưa đối chiếu)'}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-line p-3 space-y-2">
            <div className="text-[11px] font-bold text-ink-muted flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" />
              GIA HẠN / SỬA KHOẢNG HIỆU LỰC
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className={labelCls}>Hiệu lực từ</label>
                <DateInput value={a.periodFrom} onChange={a.setPeriodFrom} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Hiệu lực đến (để trống = không giới hạn)</label>
                <DateInput value={a.periodTo} onChange={a.setPeriodTo} className={inputCls} />
              </div>
              <button
                type="button"
                onClick={a.savePeriod}
                disabled={a.busy || !a.source}
                className="bg-accent hover:opacity-90 disabled:opacity-50 text-accent-ink text-xs px-3.5 py-2 rounded-md font-bold flex items-center justify-center space-x-1.5 transition-colors"
              >
                {a.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>LƯU KHOẢNG HIỆU LỰC</span>
              </button>
            </div>
            <div className="text-[11px] text-ink-faint">
              Chỉ sửa ngày khi văn bản gia hạn nói vậy. Muốn giữ dấu vết kỳ cũ thì dùng nhân bản bên dưới thay vì kéo dài kỳ cũ.
            </div>
          </div>

          <div className="rounded-md border border-line p-3 space-y-2">
            <div className="text-[11px] font-bold text-ink-muted flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5" />
              NHÂN BẢN SANG KỲ MỚI
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Số văn bản mới *</label>
                <input
                  type="text"
                  value={a.cloneDocNumber}
                  onChange={e => a.setCloneDocNumber(e.target.value)}
                  placeholder="VD: 2500/2026/TB-BĐH"
                  className={`${inputCls} font-mono font-bold`}
                />
              </div>
              <div>
                <label className={labelCls}>Tên chương trình</label>
                <input
                  type="text"
                  value={a.cloneName}
                  onChange={e => a.setCloneName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Ngày văn bản</label>
                <DateInput value={a.cloneDocDate} onChange={a.setCloneDocDate} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Hiệu lực từ *</label>
                  <DateInput value={a.cloneFrom} onChange={a.setCloneFrom} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Hiệu lực đến</label>
                  <DateInput value={a.cloneTo} onChange={a.setCloneTo} className={inputCls} />
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={a.cloneProgram}
              disabled={a.busy || !a.source}
              className="bg-accent hover:opacity-90 disabled:opacity-50 text-accent-ink text-xs px-3.5 py-2 rounded-md font-bold flex items-center space-x-1.5 transition-colors"
            >
              {a.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              <span>NHÂN BẢN</span>
            </button>
            <div className="text-[11px] text-ink-faint">
              Chép nguyên bảng lãi suất, phí, điều kiện và thẩm quyền sang kỳ mới. Bản mới luôn mang cờ <strong>chưa đối chiếu văn bản gốc</strong> nên chưa chào khách được — sửa từng ô cho khớp văn bản kỳ này trước.
            </div>
          </div>

          {a.message && (
            <div className="text-[11px] font-bold text-ink-muted">{a.message}</div>
          )}
        </>
      )}
    </div>
  );
};
