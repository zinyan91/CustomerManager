import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Header: React.FC = () => {
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
    <header className={`border-b sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-sm transition-colors duration-200 ${
      isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
    }`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg border ${
          isLight ? 'bg-sky-50 border-sky-200 text-sky-600' : 'bg-slate-800 border-slate-700 text-sky-400'
        }`}>
          <span className="text-xl">🏦</span>
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight">
            QUẢN LÝ DỰ NỢ KHÁCH HÀNG & THẺ TÍN DỤNG
          </h1>
          <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Hệ thống Quản lý Hồ sơ Khách hàng, Hợp đồng Tín dụng & Tài sản Bảo đảm
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={toggleTheme}
          className={`flex items-center space-x-2 border px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
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

        {/* Live Status Indicator */}
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
          isOnline === false
            ? 'bg-red-500/10 border-red-500/30 text-red-500'
            : isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
        }`}>
          {isOnline === false ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-red-500" />
              <span>STOPPED</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span>ONLINE</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
