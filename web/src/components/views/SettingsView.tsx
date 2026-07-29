import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Settings, Sun, Moon, Sliders, Save, CheckCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [autoFormatNumber, setAutoFormatNumber] = useState(true);
  const [notifySuccess, setNotifySuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifySuccess(true);
    setTimeout(() => setNotifySuccess(false), 3000);
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
          <p className="text-xs text-slate-400 light:text-slate-500">Tùy chỉnh chế độ hiển thị Sáng/Tối và định dạng tiền tệ</p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
        {/* Theme Settings Mode */}
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
                  ? 'bg-sky-950/60 border-sky-500 text-sky-300 font-bold shadow-md'
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

        {/* Formatting Settings */}
        <div className="bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 light:text-emerald-600 uppercase flex items-center space-x-2 border-b border-slate-800 light:border-slate-200 pb-2">
            <Sliders className="w-4 h-4" />
            <span>2. ĐỊNH DẠNG SỐ TIỀN & HIỂN THỊ</span>
          </h3>

          <div className="flex items-center justify-between p-3.5 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-200 rounded-xl">
            <div>
              <div className="font-bold text-slate-200 light:text-slate-800">Tự động phân cách hàng nghìn (ví dụ: 960.000.000)</div>
              <div className="text-[11px] text-slate-400">Tự động thêm dấu chấm phân cách số tiền ngay khi bạn gõ</div>
            </div>
            <input
              type="checkbox"
              checked={autoFormatNumber}
              onChange={(e) => setAutoFormatNumber(e.target.checked)}
              className="w-5 h-5 accent-sky-600 rounded cursor-pointer"
            />
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
    </div>
  );
};
