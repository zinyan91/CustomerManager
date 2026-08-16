import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useDateFormat, type DateFormat } from '../../context/DateFormatContext';
import { useFormatSettings } from '../../context/FormatSettingsContext';
import { useFontSettings } from '../../context/FontSettingsContext';
import {
  Settings,
  Sun,
  Moon,
  Type,
  RotateCcw,
  Calendar,
  Clock,
  Sliders,
  Check,
  Palette,
  Hash,
} from 'lucide-react';
import {
  NUMBER_STYLE_SAMPLES,
  MAX_DIGITS,
  formatDecimalWith,
  formatPercentWith,
  formatTimeWith,
} from '../../lib/formatSettings';
import {
  FONT_FAMILIES,
  FONT_SIZE_LIMITS,
  FONT_PART_LABELS,
  type FontSettings,
} from '../../lib/fontSettings';

const DIGIT_OPTIONS = Array.from({ length: MAX_DIGITS + 1 }, (_, i) => i);

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { dateFormat, setDateFormat } = useDateFormat();
  const { formatSettings, updateFormatSettings } = useFormatSettings();
  const { fontSettings, updateFontSettings, resetFontSettings } = useFontSettings();

  const handleResetAll = () => {
    resetFontSettings();
    setTheme('light');
    setDateFormat('dd/mm/yyyy');
    updateFormatSettings({
      numberStyle: 'vi',
      decimalDigits: 2,
      percentDigits: 2,
      timeFormat: '24h',
      autoGroupMoneyInput: true,
    });
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3.5">
        <div>
          <h2 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" />
            <span>CÀI ĐẶT HỆ THỐNG</span>
          </h2>
          <p className="text-xs text-ink-faint mt-0.5">
            Tùy biến giao diện làm việc và quy chuẩn định dạng số liệu cá nhân hóa.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetAll}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-panel text-xs font-semibold text-ink-muted hover:text-accent transition-all shadow-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Khôi phục mặc định</span>
        </button>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ========================================================================= */}
        {/* CỘT 1: GIAO DIỆN & HIỂN THỊ */}
        {/* ========================================================================= */}
        <div className="space-y-5">
          {/* Theme Selector */}
          <div className="bg-panel border border-line p-4 sm:p-5 rounded-xl shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <h3 className="text-xs font-bold text-accent uppercase flex items-center gap-2">
                <Palette className="w-4 h-4" />
                <span>Chế độ giao diện</span>
              </h3>
              <span className="text-[11px] font-medium text-ink-faint">
                {theme === 'dark' ? 'Đang dùng: Tối' : 'Đang dùng: Sáng'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Dark Mode */}
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`relative p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  theme === 'dark'
                    ? 'bg-accent/10 border-accent text-accent shadow-xs'
                    : 'bg-surface border-line hover:border-accent/40 text-ink'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    theme === 'dark'
                      ? 'bg-accent text-white'
                      : 'bg-panel text-ink-muted border border-line'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Giao diện Tối</div>
                  <div className="text-[11px] text-ink-faint">Dark Mode</div>
                </div>
                {theme === 'dark' && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Light Mode */}
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`relative p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${
                  theme === 'light'
                    ? 'bg-accent/10 border-accent text-accent shadow-xs'
                    : 'bg-surface border-line hover:border-accent/40 text-ink'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    theme === 'light'
                      ? 'bg-accent text-white'
                      : 'bg-panel text-ink-muted border border-line'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Giao diện Sáng</div>
                  <div className="text-[11px] text-ink-faint">Light Mode</div>
                </div>
                {theme === 'light' && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Typography & Font Sizes */}
          <div className="bg-panel border border-line p-4 sm:p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <h3 className="text-xs font-bold text-accent uppercase flex items-center gap-2">
                <Type className="w-4 h-4" />
                <span>Phông chữ & Cỡ chữ</span>
              </h3>
              <button
                type="button"
                onClick={resetFontSettings}
                className="text-[11px] font-semibold text-ink-faint hover:text-accent flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            </div>

            {/* Font Family Selection Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-ink-muted">Phông chữ hiển thị</label>
              <div className="grid grid-cols-2 gap-2">
                {FONT_FAMILIES.map((f) => {
                  const isSelected = fontSettings.family === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => updateFontSettings({ family: f.key })}
                      style={{ fontFamily: f.stack }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-accent/10 border-accent text-accent font-bold shadow-xs'
                          : 'bg-surface border-line hover:border-accent/30 text-ink'
                      }`}
                    >
                      <div className="text-xs font-semibold flex items-center justify-between">
                        <span>{f.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-accent" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size Sliders */}
            <div className="space-y-3 pt-1">
              {(Object.keys(FONT_PART_LABELS) as (keyof typeof FONT_PART_LABELS)[]).map((part) => {
                const lim = FONT_SIZE_LIMITS[part];
                const currentVal = fontSettings[part] as number;
                return (
                  <div key={part} className="flex items-center gap-3">
                    <span className="w-36 text-xs text-ink-muted">
                      {FONT_PART_LABELS[part]}
                    </span>
                    <input
                      type="range"
                      min={lim.min}
                      max={lim.max}
                      step={1}
                      value={currentVal}
                      onChange={(e) =>
                        updateFontSettings({
                          [part]: Number(e.target.value),
                        } as Partial<FontSettings>)
                      }
                      className="flex-1 accent-accent h-1.5 bg-surface rounded-lg cursor-pointer"
                    />
                    <span className="w-12 text-right font-mono font-bold text-xs text-accent">
                      {currentVal}px
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Live Preview Box */}
            <div className="p-3 bg-surface border border-line rounded-lg space-y-1">
              <div className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Xem trước trực quan</span>
                <span className="text-[10px] text-ink-faint font-normal">Tự động áp dụng</span>
              </div>
              <p className="text-xs text-ink-muted">
                Dư nợ tín dụng: <span className="font-bold text-accent font-mono">4.250.000.000 VNĐ</span> · Lãi suất: <span className="font-bold text-pos font-mono">9,50%/năm</span>
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CỘT 2: QUY CHUẨN ĐỊNH DẠNG */}
        {/* ========================================================================= */}
        <div className="space-y-5">
          {/* Date & Time Formats */}
          <div className="bg-panel border border-line p-4 sm:p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <h3 className="text-xs font-bold text-accent uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Thời gian & Ngày tháng</span>
              </h3>
            </div>

            {/* Date Formats */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-ink-muted">Định dạng ngày</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dd/mm/yyyy', title: 'dd/mm/yyyy', sample: '30/07/2026' },
                  { id: 'yyyy-mm-dd', title: 'yyyy-mm-dd', sample: '2026-07-30' },
                  { id: 'mm/dd/yyyy', title: 'mm/dd/yyyy', sample: '07/30/2026' },
                ].map((opt) => {
                  const isSelected = dateFormat === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDateFormat(opt.id as DateFormat)}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        isSelected
                          ? 'bg-accent/10 border-accent text-accent font-bold shadow-xs'
                          : 'bg-surface border-line hover:border-accent/30 text-ink'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.title}</div>
                      <div className="text-[10px] font-mono text-ink-faint mt-0.5">{opt.sample}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Formats */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-semibold text-ink-muted">Định dạng giờ</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '24h', title: '24 Giờ', sample: formatTimeWith('14:30', { ...formatSettings, timeFormat: '24h' }) },
                  { id: '12h', title: '12 Giờ (AM/PM)', sample: formatTimeWith('14:30', { ...formatSettings, timeFormat: '12h' }) },
                ].map((opt) => {
                  const isSelected = formatSettings.timeFormat === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateFormatSettings({ timeFormat: opt.id as any })}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        isSelected
                          ? 'bg-accent/10 border-accent text-accent font-bold shadow-xs'
                          : 'bg-surface border-line hover:border-accent/30 text-ink'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{opt.title}</span>
                      </div>
                      <div className="text-[10px] font-mono text-ink-faint mt-0.5">{opt.sample}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Number & Currency Formats */}
          <div className="bg-panel border border-line p-4 sm:p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
              <h3 className="text-xs font-bold text-pos uppercase flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <span>Định dạng số & Tiền tệ</span>
              </h3>
            </div>

            {/* Number Separation Style */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-ink-muted">Kiểu phân cách số</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'vi', title: 'Việt Nam ( . , )' },
                  { id: 'en', title: 'Quốc tế ( , . )' },
                  { id: 'space', title: 'Khoảng trắng' },
                ].map((opt) => {
                  const isSelected = formatSettings.numberStyle === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateFormatSettings({ numberStyle: opt.id as any })}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        isSelected
                          ? 'bg-pos/10 border-pos text-pos font-bold shadow-xs'
                          : 'bg-surface border-line hover:border-pos/30 text-ink'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.title}</div>
                      <div className="text-[10px] font-mono text-ink-faint mt-0.5">
                        {NUMBER_STYLE_SAMPLES[opt.id as keyof typeof NUMBER_STYLE_SAMPLES]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Decimal & Percent Digits */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5 p-3 bg-surface border border-line rounded-lg">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink">Số lẻ thập phân</label>
                  <Hash className="w-3.5 h-3.5 text-ink-faint" />
                </div>
                <select
                  value={formatSettings.decimalDigits}
                  onChange={(e) => updateFormatSettings({ decimalDigits: parseInt(e.target.value, 10) })}
                  className="w-full rounded-md p-1.5 text-xs bg-panel border border-line text-ink font-semibold focus:border-accent outline-none"
                >
                  {DIGIT_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d} chữ số</option>
                  ))}
                </select>
                <div className="text-[10px] font-mono text-pos text-center pt-0.5">
                  {formatDecimalWith(1234567.8912, formatSettings)}
                </div>
              </div>

              <div className="space-y-1.5 p-3 bg-surface border border-line rounded-lg">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-ink">Lãi suất & Tỷ lệ (%)</label>
                  <span className="text-xs font-bold text-ink-faint">%</span>
                </div>
                <select
                  value={formatSettings.percentDigits}
                  onChange={(e) => updateFormatSettings({ percentDigits: parseInt(e.target.value, 10) })}
                  className="w-full rounded-md p-1.5 text-xs bg-panel border border-line text-ink font-semibold focus:border-accent outline-none"
                >
                  {DIGIT_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d} chữ số</option>
                  ))}
                </select>
                <div className="text-[10px] font-mono text-pos text-center pt-0.5">
                  {formatPercentWith(0.08456, formatSettings)}
                </div>
              </div>
            </div>

            {/* Auto Grouping Money Checkbox Card */}
            <label className="flex items-center justify-between p-3 bg-surface border border-line rounded-lg cursor-pointer hover:border-accent/40 transition-colors">
              <div className="pr-3">
                <div className="text-xs font-semibold text-ink">
                  Tự động phân cách hàng nghìn khi gõ tiền
                </div>
                <div className="text-[11px] text-ink-faint">
                  Ví dụ: nhập 500000000 ➔ tự động thành 500.000.000
                </div>
              </div>
              <input
                type="checkbox"
                checked={formatSettings.autoGroupMoneyInput}
                onChange={(e) => updateFormatSettings({ autoGroupMoneyInput: e.target.checked })}
                className="w-4 h-4 accent-accent rounded cursor-pointer shrink-0"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
