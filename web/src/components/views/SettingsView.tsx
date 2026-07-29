import React, { useState } from 'react';
import { Settings, Database, Sliders, Save, CheckCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [bankBranch, setBankBranch] = useState('Phòng Giao Dịch Tín Dụng Nông Nghiệp');
  const [autoFormatNumber, setAutoFormatNumber] = useState(true);
  const [notifySuccess, setNotifySuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifySuccess(true);
    setTimeout(() => setNotifySuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {notifySuccess && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 p-4 rounded-xl flex items-center space-x-3 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span>Đã lưu các thiết lập hệ thống thành công!</span>
        </div>
      )}

      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-tight flex items-center space-x-2">
            <Settings className="w-4 h-4 text-sky-400" />
            <span>CẤU HÌNH & CÀI ĐẶT HỆ THỐNG</span>
          </h2>
          <p className="text-xs text-slate-400">Quản lý tham số chi nhánh, CSDL Supabase PostgreSQL và hiển thị tiền tệ</p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
        {/* Unit & Branch Settings */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-sky-400 uppercase flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4" />
            <span>1. THÔNG TIN CHI NHÁNH & ĐƠN VỊ QUẢN LÝ</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-400 mb-1">Chi nhánh / Phòng giao dịch</label>
              <input
                type="text"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-sky-500 font-semibold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-400 mb-1">Mã đơn vị ngân hàng</label>
              <input
                type="text"
                disabled
                value="BANK_BRANCH_7902"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Currency & Formatting Settings */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-emerald-400 uppercase flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4" />
            <span>2. ĐỊNH DẠNG SỐ TIỀN & HIỂN THỊ</span>
          </h3>

          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <div className="font-bold text-slate-200">Tự động phân cách hàng nghìn (ví dụ: 960.000.000)</div>
              <div className="text-[11px] text-slate-500">Tự động thêm dấu chấm phân cách hàng nghìn ngay khi cán bộ gõ số tiền</div>
            </div>
            <input
              type="checkbox"
              checked={autoFormatNumber}
              onChange={(e) => setAutoFormatNumber(e.target.checked)}
              className="w-5 h-5 accent-sky-600 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Database Info */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold text-purple-400 uppercase flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Database className="w-4 h-4" />
            <span>3. KẾT NỐI CƠ SỞ DỮ LIỆU CLOUD (SUPABASE POSTGRESQL)</span>
          </h3>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 font-mono text-[11px] text-slate-300">
            <div><span className="text-slate-500">PostgreSQL Host:</span> db.xkzntlaybrjlkcymqius.supabase.co:5432</div>
            <div><span className="text-slate-500">Database Name:</span> postgres</div>
            <div><span className="text-slate-500">Connection Mode:</span> Direct Serverless Pool (SSL Encrypted)</div>
            <div><span className="text-slate-500">Deployment Platform:</span> Vercel Cloud Architecture</div>
          </div>
        </div>

        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-6 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-sky-600/20"
        >
          <Save className="w-4 h-4" />
          <span>LƯU CÀI ĐẶT</span>
        </button>
      </form>
    </div>
  );
};
