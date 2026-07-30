import React from 'react';
import { LayoutDashboard, Users, FileText, Building2, CreditCard, ShieldAlert, Settings, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { theme } = useTheme();

  const menuItems = [
    { id: 'dashboard', label: 'Tổng Quan Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Danh Sách Khách Hàng', icon: Users },
    { id: 'loans', label: 'Quản Lý Khoản Vay', icon: FileText },
    { id: 'collaterals', label: 'Định Giá TSĐB', icon: Building2 },
    { id: 'credit-cards', label: 'Thẻ Tín Dụng', icon: CreditCard },
    { id: 'post-loan', label: 'Kiểm Soát Sau Vay', icon: ShieldAlert },
    { id: 'settings', label: 'Cấu Hình & Cài Đặt', icon: Settings },
  ];

  const isLight = theme === 'light';
  const sidebarBg = isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800';
  const labelColor = isLight ? 'text-slate-400' : 'text-slate-500';
  const footerBorder = isLight ? 'border-slate-200' : 'border-slate-800';
  const footerText = isLight ? 'text-slate-400' : 'text-slate-500';
  const inactiveClass = isLight
    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800';

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed top-[53px] inset-x-0 bottom-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Navigation: Fixed left column on desktop & slide-out on mobile */}
      <aside
        className={`fixed top-[53px] md:top-[57px] bottom-0 left-0 z-40 w-64 md:w-60 ${sidebarBg} border-r flex flex-col justify-between p-3 overflow-y-auto shrink-0 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 py-2">
            <span className={`text-[11px] font-bold ${labelColor} uppercase tracking-wider`}>
              Phân Hệ Chức Năng
            </span>
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2.5 md:py-2 rounded-xl md:rounded-lg font-medium text-xs transition-all ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : inactiveClass
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className={`border-t ${footerBorder} pt-3 px-3 text-center`}>
          <div className={`text-[11px] ${footerText} font-semibold font-mono tracking-wide`}>
            v2.4.0 • Customer Manager
          </div>
        </div>
      </aside>
    </>
  );
};
