import React from 'react';
import { LayoutDashboard, Users, FileText, Building2, CreditCard, ShieldAlert, Settings } from 'lucide-react';

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
    { id: 'settings', label: 'Cấu Hình & Cài Đặt', icon: Settings },
  ];

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-3 min-h-[calc(100vh-57px)] shrink-0">
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
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all ${
                isActive
                  ? 'bg-sky-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-slate-800 pt-3 px-2">
        <div className="text-[11px] text-slate-500 font-medium">
          Dữ liệu đồng bộ trực tiếp Supabase PostgreSQL
        </div>
      </div>
    </aside>
  );
};
