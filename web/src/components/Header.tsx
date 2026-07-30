import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Wifi, WifiOff, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { theme, toggleTheme } = useTheme();
  const [isOnline, setIsOnline] = useState<boolean | null>(true);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('Customers').select('Id').limit(1);
      setIsOnline(!error);
    } catch {
      setIsOnline(false);
    }
  };

  const isLight = theme === 'light';

  return (
    <header className={`border-b sticky top-0 z-50 px-3 md:px-6 py-2.5 md:py-3 flex items-center justify-between shadow-sm transition-colors duration-200 ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
    }`}>
      <div className="flex items-center space-x-2.5 md:space-x-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className={`md:hidden p-2 rounded-xl border transition-colors ${
            isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title="Mở menu chức năng"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className={`p-1.5 md:p-2 rounded-lg border hidden sm:block ${
          isLight ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-slate-800 border-slate-700 text-sky-400'
        }`}>
          <span className="text-lg md:text-xl">🏦</span>
        </div>
        <div>
          <h1 className="text-xs sm:text-sm md:text-base font-bold tracking-tight leading-tight">
            QUẢN LÝ DỰ NỢ KHÁCH HÀNG & THẺ TÍN DỤNG
          </h1>
          <p className={`text-[11px] md:text-xs hidden md:block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Hệ thống Quản lý Hồ sơ Khách hàng, Hợp đồng Tín dụng & Tài sản Bảo đảm
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-3">
        <button
          onClick={toggleTheme}
          className={`flex items-center space-x-1.5 border px-2.5 md:px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title="Chuyển đổi Chế độ Tối / Sáng"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Giao diện Sáng</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">Giao diện Tối</span>
            </>
          )}
        </button>

        {/* Live Status Indicator */}
        <div className={`flex items-center space-x-1.5 px-2.5 md:px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
          isOnline === false
            ? 'bg-red-500/10 border-red-500/30 text-red-500'
            : isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
        }`}>
          {isOnline === false ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">STOPPED</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">ONLINE</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
