import React from 'react';
import { Database, ShieldCheck, User } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="bg-sky-500/10 p-2.5 rounded-xl border border-sky-500/20">
          <span className="text-2xl">🏦</span>
        </div>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent tracking-wide">
            HỆ THỐNG QUẢN LÝ DỰ NỢ KHÁCH HÀNG & THẺ TÍN DỤNG
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Phân Hệ Quản Lý Hồ Sơ Khách Hàng, Hợp Đồng Tín Dụng & Tài Sản Bảo Đảm
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Status Badge */}
        <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <Database className="w-4 h-4 animate-pulse text-emerald-400" />
          <span>SUPABASE CLOUD ACTIVE</span>
        </div>

        {/* User Info */}
        <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700/60 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-medium text-slate-200">BANKER SYSTEM</span>
          <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
            <User className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </header>
  );
};
