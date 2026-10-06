import React, { useState, useRef, useEffect } from 'react';
import { Users, User, ChevronDown, Check, Search, X } from 'lucide-react';
import { useUserScope } from '../../context/UserScopeContext';
import { useAuth } from '../../context/AuthContext';

export const UserScopeSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { can, user } = useAuth();
  const { managedUsers, selectedUserId, setSelectedUserId, selectedUser, error } = useUserScope();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!can('scope.switch')) return null;

  const totalCustomers = managedUsers.reduce((sum, u) => sum + (u.customerCount || 0), 0);
  const scopeLabel =
    selectedUserId === 'all'
      ? 'Tất cả tài khoản'
      : selectedUserId === 'unassigned'
      ? 'Chưa phân công'
      : selectedUserId === user?.id
      ? 'Tài khoản của tôi'
      : selectedUser?.fullName || 'Đã chọn';

  const filteredUsers = managedUsers.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return u.fullName.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const getRoleBadge = (role: string) => {
    if (role === 'master_admin') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400">Master</span>;
    }
    if (role === 'user_admin') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">Admin</span>;
    }
    if (role === 'unassigned') {
      return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">Chung</span>;
    }
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">User</span>;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-line/80 bg-surface/80 hover:bg-surface text-ink text-xs font-semibold transition-all shadow-2xs cursor-pointer focus-visible:outline-accent"
        title="Chọn tài khoản cán bộ để tổng hợp và xem dữ liệu"
      >
        <Users className="w-3.5 h-3.5 text-accent shrink-0" />
        <div className="flex items-center gap-1 min-w-0 max-w-[150px] sm:max-w-[200px]">
          <span className="text-[11px] text-ink-muted truncate">Tài khoản:</span>
          <span className="text-xs font-bold text-ink truncate">
            {scopeLabel}
          </span>
        </div>
        <ChevronDown className="w-3 h-3 text-ink-muted shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-72 sm:w-80 rounded-2xl bg-panel border border-line shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 border-b border-line/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent" />
                <span>Quản trị dữ liệu theo tài khoản</span>
              </span>
              <span className="text-[10px] font-semibold text-ink-muted">
                {managedUsers.length} tài khoản
              </span>
            </div>
            <p className="text-[10px] text-ink-faint mt-0.5">
              Chọn tài khoản để chỉ xem danh sách khách hàng & dữ liệu của cán bộ đó.
            </p>
            {error && <p role="alert" className="text-[10px] text-neg mt-0.5">{error}</p>}
          </div>

          {/* Ô tìm kiếm nhanh tài khoản */}
          <div className="pt-2 pb-1 px-1">
            <div className="relative flex items-center">
              <Search className="w-3 h-3 text-ink-faint absolute left-2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên cán bộ..."
                className="w-full pl-7 pr-6 py-1 rounded-lg bg-surface border border-line text-ink text-xs focus:outline-none focus:border-accent"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-1.5 text-ink-faint hover:text-ink p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Danh sách lựa chọn */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pt-1">
            {/* Lựa chọn Tất cả */}
            <button
              type="button"
              onClick={() => {
                setSelectedUserId('all');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                selectedUserId === 'all'
                  ? 'bg-accent/15 text-accent font-bold'
                  : 'hover:bg-surface text-ink font-medium'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                <span>Tất cả tài khoản (tải toàn bộ)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-ink-muted font-mono">{totalCustomers} KH</span>
                {selectedUserId === 'all' && <Check className="w-3.5 h-3.5 text-accent" />}
              </div>
            </button>

            {/* Các tài khoản cụ thể */}
            {filteredUsers.map((u) => {
              const isSelected = selectedUserId === u.userId;
              return (
                <button
                  key={u.userId}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(u.userId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-accent/15 text-accent font-bold'
                      : 'hover:bg-surface text-ink font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <User className="w-3.5 h-3.5 shrink-0 text-ink-muted" />
                    <span className="truncate">{u.userId === user?.id ? `${u.fullName} (tôi)` : u.fullName}</span>
                    {getRoleBadge(u.role)}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-ink-muted font-mono">{u.customerCount} KH</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                  </div>
                </button>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-4 text-xs text-ink-faint">
                Không tìm thấy tài khoản nào khớp.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
