import React from 'react';
import { Database, User } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 text-sky-400">
          <span className="text-xl">🏦</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100 tracking-tight">
            HỆ THỐNG QUẢN LÝ DỰ NỢ KHÁCH HÀNG & THẺ TÍN DỤNG
          </h1>
          <p className="text-xs text-slate-400">
            Quản lý Hồ sơ Khách hàng, Hợp đồng Tín dụng & Tài sản Bảo đảm
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-semibold">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>SUPABASE CLOUD</span>
        </div>

        <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-slate-300">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold">BANKER</span>
        </div>
      </div>
    </header>
  );
};
