import React from 'react';
import { LayoutDashboard, Users, FileText, Building2, CreditCard, ShieldAlert } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tổng Quan Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Danh Sách Khách Hàng', icon: Users },
    { id: 'loans', label: 'Quản Lý Khoản Vay', icon: FileText },
    { id: 'collaterals', label: 'Định Giá TSĐB', icon: Building2 },
    { id: 'credit-cards', label: 'Thẻ Tín Dụng', icon: CreditCard },
    { id: 'post-loan', label: 'Kiểm Soát Sau Vay', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 min-h-[calc(100vh-61px)] shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Phân Hệ Chức Năng
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-800/80 pt-4 px-2">
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
          <div className="text-[11px] text-slate-400 font-semibold mb-1">
            🌐 SUPABASE CLOUD SYNCED
          </div>
          <div className="text-[10px] text-slate-500">
            Hệ thống Quản lý Dự nợ & Phân tích Tín dụng Ngân hàng
          </div>
        </div>
      </div>
    </aside>
  );
};
