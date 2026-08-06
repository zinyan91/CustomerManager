import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useDateFormat, type DateFormat } from '../../context/DateFormatContext';
import { Settings, Sun, Moon, Sliders, Calendar, Clock, Save, CheckCircle, Type, RotateCcw, Wrench } from 'lucide-react';
import { useFormatSettings } from '../../context/FormatSettingsContext';
import {
  NUMBER_STYLE_SAMPLES, MAX_DIGITS,
  formatDecimalWith, formatPercentWith, formatTimeWith, formatMoneyWith,
} from '../../lib/formatSettings';
import { fmtMoney } from '../../lib/utils';
import {
  fetchContractsAPI, fetchRepaymentSchedulesAPI, bulkSaveRepaymentSchedulesAPI,
} from '../../lib/api';
import {
  alignLastPeriodToMaturity, needsLastPeriodAlignment, recalculateSchedules,
} from '../../lib/loanMath';
import { useFontSettings } from '../../context/FontSettingsContext';
import {
  FONT_FAMILIES, FONT_SIZE_LIMITS, FONT_PART_LABELS, type FontSettings,
} from '../../lib/fontSettings';

const DIGIT_OPTIONS = Array.from({ length: MAX_DIGITS + 1 }, (_, i) => i);

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { dateFormat, setDateFormat } = useDateFormat();
  const { formatSettings, updateFormatSettings } = useFormatSettings();
  const { fontSettings, updateFontSettings, resetFontSettings } = useFontSettings();
  const [notifySuccess, setNotifySuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifySuccess(true);
    setTimeout(() => setNotifySuccess(false), 3000);
  };

  const [dongBoDangChay, setDongBoDangChay] = useState(false);
  const [ketQuaDongBo, setKetQuaDongBo] = useState<string | null>(null);

  const dongBoKyCuoi = async () => {
    setDongBoDangChay(true);
    setKetQuaDongBo(null);
    try {
      const kunns = (await fetchContractsAPI()).filter(c => c.IsSettled !== true);
      let daSua = 0;
      let boQua = 0;

      for (const kunn of kunns) {
        const daoHan = kunn.KunnDueDate || kunn.ContractEndDate || null;
        const lich = await fetchRepaymentSchedulesAPI(kunn.Id);
        if (lich.length === 0) continue;

        if (!needsLastPeriodAlignment(lich, daoHan)) {
          const kyCuoi = [...lich].sort((a, b) => a.PeriodNumber - b.PeriodNumber).at(-1);
          if (daoHan && kyCuoi && kyCuoi.DueDate !== daoHan) boQua += 1;
          continue;
        }

        const canhLai = alignLastPeriodToMaturity(lich, daoHan);
        await bulkSaveRepaymentSchedulesAPI(recalculateSchedules(canhLai, kunn));
        daSua += 1;
      }

      setKetQuaDongBo(`Đã sửa ${daSua} khoản · bỏ qua ${boQua} khoản`);
    } catch (err: any) {
      setKetQuaDongBo(`Không chạy được: ${err.message}`);
    } finally {
      setDongBoDangChay(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {notifySuccess && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 p-4 rounded-xl flex items-center space-x-3 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>Đã lưu các thiết lập cá nhân thành công!</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 light:text-slate-900 uppercase tracking-tight flex items-center space-x-2">
            <Settings className="w-4 h-4 text-sky-400" />
            <span>CÀI ĐẶT ỨNG DỤNG CÁ NHÂN</span>
          </h2>
          <p className="text-xs text-slate-400 light:text-slate-500">Tùy chỉnh chế độ hiển thị Sáng/Tối, định dạng số và định dạng ngày tháng năm</p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">

        <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-sky-400 light:text-sky-600 uppercase flex items-center justify-between border-b border-slate-800 light:border-slate-200 pb-2">
            <span className="flex items-center space-x-2">
              <Type className="w-4 h-4" />
              <span>CỠ CHỮ & FONT HIỂN THỊ</span>
            </span>
            <button type="button" onClick={resetFontSettings}
              className="flex items-center gap-1 normal-case font-semibold text-[11px] text-slate-400 hover:text-sky-400">
              <RotateCcw className="w-3 h-3" />Về mặc định
            </button>
          </h3>

          <div>
            <label className="block mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Font chữ</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {FONT_FAMILIES.map(f => (
                <div key={f.key}
                  onClick={() => updateFontSettings({ family: f.key })}
                  style={{ fontFamily: f.stack }}
                  className={`cursor-pointer p-3 rounded-xl border transition-all ${
                    fontSettings.family === f.key
                      ? 'bg-sky-950/60 light:bg-sky-50 border-sky-500 text-sky-300 light:text-sky-900 font-bold'
                      : 'bg-slate-950 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 hover:border-slate-700'
                  }`}>
                  <div>{f.label}</div>
                  <div className="text-[11px] opacity-80 mt-0.5">Dư nợ 1.930.000.000 đồng — lãi 9,50%/năm</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {(Object.keys(FONT_PART_LABELS) as (keyof typeof FONT_PART_LABELS)[]).map(part => {
              const lim = FONT_SIZE_LIMITS[part];
              return (
                <div key={part} className="flex flex-wrap items-center gap-3">
                  <span className="w-full md:w-56 text-[11px] font-semibold text-slate-400">
                    {FONT_PART_LABELS[part]}
                  </span>
                  <input type="range" min={lim.min} max={lim.max} step={1}
                    value={fontSettings[part] as number}
                    onChange={e => updateFontSettings({ [part]: Number(e.target.value) } as Partial<FontSettings>)}
                    className="flex-1 min-w-[140px] accent-sky-500" />
                  <span className="w-14 text-right font-mono font-bold text-sky-400 light:text-sky-600">
                    {fontSettings[part]}px
                  </span>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-800 light:border-slate-200 p-3 space-y-1.5">
            <div className="text-sm font-bold text-slate-200 light:text-slate-800">Xem trước tiêu đề mục</div>
            <div className="text-xs text-slate-400">Nội dung bảng và nhãn nhập liệu hiển thị ở cỡ này.</div>
            <div className="text-[11px] text-slate-500">Nhãn nhỏ, viên trạng thái và ghi chú.</div>
            <div className="font-mono text-sky-400 light:text-sky-600">2002/HĐTD/9653222/GNN-01 · 4.000.000.000 VNĐ</div>
          </div>

          <p className="text-[11px] text-slate-500">
            Thiết lập lưu trên máy này và áp cho mọi màn hình. Bản in PDF giữ cỡ chữ riêng để không vỡ khổ giấy.
          </p>
        </div>
        <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-sky-400 light:text-sky-600 uppercase flex items-center space-x-2 border-b border-slate-800 light:border-slate-200 pb-2">
            <Sun className="w-4 h-4" />
            <span>1. CHẾ ĐỘ GIAO DIỆN SÁNG / TỐI (THEME)</span>
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => setTheme('dark')}
              className={`cursor-pointer p-4 rounded-xl border flex items-center space-x-3 transition-all ${
                theme === 'dark'
                  ? 'bg-sky-950/60 light:bg-sky-50 border-sky-500 text-sky-300 light:text-sky-900 font-bold shadow-md'
                  : 'bg-slate-950 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="p-2 bg-slate-900 rounded-lg text-sky-400">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200 light:text-slate-900">Giao diện Tối (Dark Mode)</div>
                <div className="text-[11px] text-slate-400">Tối ưu ban đêm, dịu mắt cán bộ</div>
              </div>
            </div>

            <div
              onClick={() => setTheme('light')}
              className={`cursor-pointer p-4 rounded-xl border flex items-center space-x-3 transition-all ${
                theme === 'light'
                  ? 'bg-sky-50 border-sky-500 text-sky-800 font-bold shadow-md'
                  : 'bg-slate-950 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200 light:text-slate-900">Giao diện Sáng (Light Mode)</div>
                <div className="text-[11px] text-slate-400">Trắng sáng văn phòng tiêu chuẩn</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-purple-400 light:text-purple-600 uppercase flex items-center space-x-2 border-b border-slate-800 light:border-slate-200 pb-2">
            <Calendar className="w-4 h-4" />
            <span>2. ĐỊNH DẠNG NGÀY THÁNG NĂM (DATE FORMAT)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'dd/mm/yyyy', title: 'dd/mm/yyyy', label: 'Ngày/Tháng/Năm (Việt Nam)', sample: '30/07/2026' },
              { id: 'mm/dd/yyyy', title: 'mm/dd/yyyy', label: 'Tháng/Ngày/Năm (Chuẩn Mỹ)', sample: '07/30/2026' },
              { id: 'yyyy-mm-dd', title: 'yyyy-mm-dd', label: 'Năm-Tháng-Ngày (ISO)', sample: '2026-07-30' },
            ].map((opt) => (
              <div
                key={opt.id}
                onClick={() => setDateFormat(opt.id as DateFormat)}
                className={`cursor-pointer p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  dateFormat === opt.id
                    ? 'bg-purple-950/60 light:bg-purple-50 border-purple-500 text-purple-300 light:text-purple-900 font-bold shadow-md'
                    : 'bg-slate-950 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 light:text-slate-900">{opt.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{opt.label}</div>
                </div>
                <div className="mt-2 text-[11px] font-mono text-purple-400 light:text-purple-600 font-semibold bg-slate-900 light:bg-slate-100 p-1.5 rounded text-center border border-slate-800 light:border-slate-200">
                  Ví dụ: {opt.sample}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 light:text-emerald-600 uppercase flex items-center space-x-2 border-b border-slate-800 light:border-slate-200 pb-2">
            <Sliders className="w-4 h-4" />
            <span>3. ĐỊNH DẠNG SỐ TIỀN & HIỂN THỊ</span>
          </h3>

          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-300 light:text-slate-700 uppercase">Kiểu phân cách</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { id: 'vi', title: 'Việt Nam', label: 'Nghìn dấu chấm, thập phân dấu phẩy' },
                { id: 'en', title: 'Quốc tế', label: 'Nghìn dấu phẩy, thập phân dấu chấm' },
                { id: 'space', title: 'Khoảng trắng', label: 'Nghìn khoảng trắng, thập phân dấu phẩy' },
              ] as const).map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => updateFormatSettings({ numberStyle: opt.id })}
                  className={`cursor-pointer p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                    formatSettings.numberStyle === opt.id
                      ? 'bg-emerald-950/60 light:bg-emerald-50 border-emerald-500 text-emerald-300 light:text-emerald-900 font-bold shadow-md'
                      : 'bg-slate-950 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-200 light:text-slate-900">{opt.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{opt.label}</div>
                  </div>
                  <div className="mt-2 text-[11px] font-mono text-emerald-400 light:text-emerald-600 font-semibold bg-slate-900 light:bg-slate-100 p-1.5 rounded text-center border border-slate-800 light:border-slate-200">
                    {NUMBER_STYLE_SAMPLES[opt.id]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl space-y-2">
              <div>
                <div className="font-bold text-slate-200 light:text-slate-800 text-xs">Số thập phân</div>
                <div className="text-[11px] text-slate-400">Số chữ số sau dấu thập phân của các số thường</div>
              </div>
              <select
                value={formatSettings.decimalDigits}
                onChange={(e) => updateFormatSettings({ decimalDigits: parseInt(e.target.value, 10) })}
                className="w-full rounded-xl p-2 text-xs bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 text-slate-200 light:text-slate-900"
              >
                {DIGIT_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} chữ số</option>
                ))}
              </select>
              <div className="text-[11px] font-mono text-emerald-400 light:text-emerald-600 bg-slate-900 light:bg-slate-100 p-1.5 rounded text-center border border-slate-800 light:border-slate-200">
                Ví dụ: {formatDecimalWith(1234567.89123, formatSettings)}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl space-y-2">
              <div>
                <div className="font-bold text-slate-200 light:text-slate-800 text-xs">Phần trăm</div>
                <div className="text-[11px] text-slate-400">Số chữ số sau dấu thập phân của lãi suất, tỷ lệ</div>
              </div>
              <select
                value={formatSettings.percentDigits}
                onChange={(e) => updateFormatSettings({ percentDigits: parseInt(e.target.value, 10) })}
                className="w-full rounded-xl p-2 text-xs bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 text-slate-200 light:text-slate-900"
              >
                {DIGIT_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} chữ số</option>
                ))}
              </select>
              <div className="text-[11px] font-mono text-emerald-400 light:text-emerald-600 bg-slate-900 light:bg-slate-100 p-1.5 rounded text-center border border-slate-800 light:border-slate-200">
                Ví dụ: {formatPercentWith(0.08456, formatSettings)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl">
            <div>
              <div className="font-bold text-slate-200 light:text-slate-800">
                Tự động phân cách hàng nghìn khi gõ (ví dụ: {formatMoneyWith(960000000, formatSettings)})
              </div>
              <div className="text-[11px] text-slate-400">Tự động thêm dấu phân cách vào ô nhập số tiền ngay khi bạn gõ</div>
            </div>
            <input
              type="checkbox"
              checked={formatSettings.autoGroupMoneyInput}
              onChange={(e) => updateFormatSettings({ autoGroupMoneyInput: e.target.checked })}
              className="w-5 h-5 accent-sky-600 rounded cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl text-[11px] text-slate-400">
            Số tiền luôn hiển thị nguyên đồng, không có phần thập phân — chỉ kiểu phân cách ở trên được áp dụng.
            Ví dụ hiện tại: <span className="font-mono text-emerald-400 light:text-emerald-600 font-semibold">{fmtMoney(1500000000)}</span>
          </div>
        </div>

        <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-sky-400 light:text-sky-600 uppercase flex items-center space-x-2 border-b border-slate-800 light:border-slate-200 pb-2">
            <Clock className="w-4 h-4" />
            <span>4. ĐỊNH DẠNG GIỜ (TIME FORMAT)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { id: '24h', title: '24 giờ', label: 'Chuẩn Việt Nam' },
              { id: '12h', title: '12 giờ (AM/PM)', label: 'Chuẩn Anh - Mỹ' },
            ] as const).map((opt) => (
              <div
                key={opt.id}
                onClick={() => updateFormatSettings({ timeFormat: opt.id })}
                className={`cursor-pointer p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                  formatSettings.timeFormat === opt.id
                    ? 'bg-sky-950/60 light:bg-sky-50 border-sky-500 text-sky-300 light:text-sky-900 font-bold shadow-md'
                    : 'bg-slate-950 light:bg-slate-50 border-slate-800 light:border-slate-200 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 light:text-slate-900">{opt.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{opt.label}</div>
                </div>
                <div className="mt-2 text-[11px] font-mono text-sky-400 light:text-sky-600 font-semibold bg-slate-900 light:bg-slate-100 p-1.5 rounded text-center border border-slate-800 light:border-slate-200">
                  Ví dụ: {formatTimeWith('14:30', { ...formatSettings, timeFormat: opt.id })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-sky-600/20"
        >
          <Save className="w-4 h-4" />
          <span>LƯU CÀI ĐẶT CÁ NHÂN</span>
        </button>
      </form>

      <div className="space-y-3 border-t border-slate-800 light:border-slate-200 pt-5">
        <h3 className="text-xs font-bold text-amber-400 light:text-amber-600 uppercase flex items-center space-x-2 border-b border-slate-800 light:border-slate-200 pb-2">
          <Wrench className="w-3.5 h-3.5" />
          <span>BẢO TRÌ DỮ LIỆU</span>
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={dongBoKyCuoi}
            disabled={dongBoDangChay}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center space-x-2"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>{dongBoDangChay ? 'Đang chạy…' : 'Đồng bộ kỳ cuối theo ngày đáo hạn'}</span>
          </button>
          {ketQuaDongBo && (
            <span className="text-xs font-mono font-bold text-slate-300 light:text-slate-700">
              {ketQuaDongBo}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
