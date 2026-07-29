import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Database } from 'lucide-react';

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-slate-900 light:bg-white border-b border-slate-800 light:border-slate-200 sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-sm transition-colors duration-200">
      <div className="flex items-center space-x-3">
        <div className="bg-slate-800 light:bg-sky-50 p-2 rounded-lg border border-slate-700 light:border-sky-200 text-sky-400">
          <span className="text-xl">🏦</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100 light:text-slate-900 tracking-tight">
            QUẢN LÝ DỰ NỢ KHÁCH HÀNG & THẺ TÍN DỤNG
          </h1>
          <p className="text-xs text-slate-400 light:text-slate-500">
            Hệ thống Quản lý Hồ sơ Khách hàng, Hợp đồng Tín dụng & Tài sản Bảo đảm
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={toggleTheme}
          className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 light:bg-slate-100 light:hover:bg-slate-200 border border-slate-700 light:border-slate-300 text-slate-200 light:text-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
          title="Chuyển đổi Chế độ Tối / Sáng"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Giao diện Sáng</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-sky-600" />
              <span>Giao diện Tối</span>
            </>
          )}
        </button>

        <div className="flex items-center space-x-2 bg-slate-950 light:bg-emerald-50 border border-slate-800 light:border-emerald-200 text-emerald-400 light:text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
          <Database className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
          <span>SUPABASE CLOUD</span>
        </div>
      </div>
    </header>
  );
};
