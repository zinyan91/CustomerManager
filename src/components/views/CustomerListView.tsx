import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { Customer } from '../../types';
import { isCustomerArchived, CUSTOMER_STATUS_LABEL, type CustomerStatusFilter } from '../../lib/customerStatus';
import { fmtDate, formatNationalId, parseNationalIdInput, formatPhoneNumber } from '../../lib/utils';
import {
  Search, Plus, UserCheck, Users, Archive, ArchiveRestore,
  Edit3, Phone, X
} from 'lucide-react';
import { Toast } from '../Toast';
import { DataTable, type ColumnDef } from '../ui/DataTable';
import { CustomerProgressCell } from '../customers/CustomerProgressCell';
import { useCustomerProgress } from '../../hooks/useCustomerProgress';
import { useCustomerListController } from '../../hooks/useCustomerListController';
import { CustomerDrawerForm } from '../customer/CustomerDrawerForm';
import { customerProfilePath } from '../../lib/customerRoutes';
import { useSelectedCustomerId } from '../../hooks/useSelectedCustomerId';
import { ROUTE_OF } from '../../lib/routes';
import { useUserScope } from '../../context/UserScopeContext';
import { useAuth } from '../../context/AuthContext';
import { BTN_PRIMARY } from '../../lib/uiClasses';
import { WorkspacePageHeader } from '../ui/WorkspacePageHeader';
import { CustomerListSummaryStrip } from '../customers/CustomerListSummaryStrip';

export const CustomerListView: React.FC = () => {
  const { can, user } = useAuth();
  const { selectedUserId, selectedUser, setSelectedUserId } = useUserScope();
  const scopeBannerLabel =
    selectedUserId === 'all' ? 'Tất cả tài khoản' : selectedUserId === 'unassigned' ? 'Chưa phân công' : selectedUser?.fullName || 'Tài khoản đã chọn';
  const {
    loading,
    selectedCustomer,
    isDrawerOpen,
    setIsDrawerOpen,
    drawerTab,
    setDrawerTab,
    searchCif,
    setSearchCif,
    searchName,
    setSearchName,
    searchNationalId,
    setSearchNationalId,
    formState,
    statusFilter,
    setStatusFilter,
    statusCounts,
    visibleCustomers,
    customers,
    archiving,
    notification,
    setNotification,
    fetchCustomers,
    toggleArchived,
    openDrawerForCreate,
    openDrawerForEdit,
    handleSaveCustomer,
    handleDeleteCustomer,
    parseAndApplySnippet,
  } = useCustomerListController();

  const customerIds = useMemo(() => visibleCustomers.map(c => c.Id), [visibleCustomers]);
  const { progress: progressMap, error: progressError } = useCustomerProgress(customerIds);

  const navigate = useNavigate();
  const profileCustomerId = useSelectedCustomerId();
  const [profileAppliedFor, setProfileAppliedFor] = useState<number | null>(null);

  useEffect(() => {
    if (profileCustomerId === null) {
      if (profileAppliedFor !== null) setProfileAppliedFor(null);
      return;
    }
    if (profileAppliedFor === profileCustomerId) return;
    const c = customers.find(x => x.Id === profileCustomerId);
    if (!c) return;
    setStatusFilter(isCustomerArchived(c) ? 'archived' : 'active');
    setProfileAppliedFor(profileCustomerId);
    openDrawerForEdit(c);
  }, [profileCustomerId, profileAppliedFor, customers, openDrawerForEdit, setStatusFilter]);

  useEffect(() => {
    if (profileCustomerId === null) return;
    if (profileAppliedFor !== profileCustomerId) return;
    if (isDrawerOpen) return;
    navigate(ROUTE_OF.customers, { replace: true });
  }, [profileCustomerId, profileAppliedFor, isDrawerOpen, navigate]);

  const khlqCount = useMemo(() => {
    return visibleCustomers.filter(c => !!c.SpouseName || !!c.CifKhlq).length;
  }, [visibleCustomers]);

  return (
    <div data-workspace-page className="space-y-0 w-full font-app pb-8">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      <WorkspacePageHeader
        title="Danh sách khách hàng"
        icon={UserCheck}
        actions={
          <button type="button" onClick={openDrawerForCreate} className={`${BTN_PRIMARY} text-xs px-4 py-2 inline-flex items-center gap-1.5 cursor-pointer`}>
            <Plus className="w-4 h-4" />
            <span>Thêm khách hàng mới</span>
          </button>
        }
      />

      {/* Banner thông báo phạm vi tài khoản đang xem (dành cho Admin) */}
      {can('scope.switch') && user && selectedUserId !== user.id && (
        <div data-workspace-panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-line text-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-accent-soft text-accent">
              <Users className="w-4 h-4" />
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-ink-muted">Đang xem dữ liệu của:</span>
              <span className="font-bold text-ink">{scopeBannerLabel}</span>
              <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-mono text-[10px] font-bold">
                {visibleCustomers.length} khách hàng
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedUserId(user.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line bg-panel hover:bg-surface text-ink text-xs font-semibold cursor-pointer shadow-2xs transition-all"
            title="Quay lại xem dữ liệu của chính mình"
          >
            <X className="w-3.5 h-3.5 text-ink-muted" />
            <span>Về tài khoản của tôi</span>
          </button>
        </div>
      )}

      <CustomerListSummaryStrip
        counts={statusCounts}
        status={statusFilter}
        relatedCount={khlqCount}
        onStatusChange={setStatusFilter}
      />

      {/* 3. Khung Tìm Kiếm & Bảng Dữ Liệu Khách Hàng */}
      <div data-workspace-panel className="bg-panel">
        {/* Unified Command Toolbar: Tìm kiếm đa tiêu chí + Bộ lọc Trạng thái */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 px-4 py-3 border-b border-line">
          {/* Cụm Tìm Kiếm Tinh Gọn */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchCustomers();
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-2xl"
          >
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                placeholder="Mã CIF..."
                value={searchCif}
                onChange={(e) => setSearchCif(e.target.value)}
                className="w-full pl-8 pr-7 py-2 rounded-[var(--r-control)] border border-line bg-surface text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
              />
              {searchCif && (
                <button
                  type="button"
                  onClick={() => setSearchCif('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Họ tên Khách hàng..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--r-control)] border border-line bg-surface text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
              />
              {searchName && (
                <button
                  type="button"
                  onClick={() => setSearchName('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Số CCCD..."
                  value={formatNationalId(searchNationalId)}
                  onChange={(e) => setSearchNationalId(parseNationalIdInput(e.target.value))}
                  className="w-full px-3 py-2 rounded-[var(--r-control)] border border-line bg-surface text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
                />
                {searchNationalId && (
                  <button
                    type="button"
                    onClick={() => setSearchNationalId('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="bg-accent hover:opacity-90 text-accent-ink px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Tìm</span>
              </button>
            </div>
          </form>

          {/* Phải: Bộ Lọc Trạng Thái Switcher */}
          <div className="flex items-center bg-surface/80 p-0.5 rounded-xl border border-line/50 shrink-0">
            {(['active', 'archived', 'ALL'] as CustomerStatusFilter[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-accent text-accent-ink shadow-xs font-bold'
                    : 'text-ink-faint hover:text-ink hover:bg-panel-muted/60'
                }`}
              >
                {CUSTOMER_STATUS_LABEL[s]} ({statusCounts[s]})
              </button>
            ))}
          </div>
        </div>

        {/* Bảng Dữ Liệu Khách Hàng Adaptive Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-16 text-ink-faint text-xs">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-accent mr-3"></div>
              <span>Đang tải dữ liệu khách hàng...</span>
            </div>
          ) : (
            <DataTable
              rows={visibleCustomers}
              rowKey={c => c.Id}
              onRowClick={openDrawerForEdit}
              isSelected={c => selectedCustomer?.Id === c.Id}
              emptyText={statusFilter === 'archived'
                ? 'Chưa có hồ sơ nào được lưu trữ.'
                : 'Không tìm thấy khách hàng nào.'}
              cardTitle={c => c.FullName}
              cardSubtitle={c => c.CifKh}
              actions={c => (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(customerProfilePath(c.Id));
                    }}
                    className="border border-line/80 bg-panel-muted/80 hover:bg-accent hover:text-accent-ink hover:border-accent text-ink px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 transition-all shadow-2xs cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Sửa</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleArchived(c);
                    }}
                    disabled={archiving === c.Id}
                    className="border border-line/80 bg-panel-muted/80 hover:border-ink/40 text-ink-muted hover:text-ink px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer shadow-2xs"
                  >
                    {isCustomerArchived(c)
                      ? <ArchiveRestore className="w-3 h-3 text-pos" />
                      : <Archive className="w-3 h-3" />}
                    <span>{isCustomerArchived(c) ? 'Bỏ lưu trữ' : 'Lưu trữ hồ sơ'}</span>
                  </button>
                </div>
              )}
              columns={([
                {
                  key: 'cif',
                  label: 'Mã CIF',
                  priority: 1,
                  render: c => (
                    <span className="font-mono text-xs text-accent font-bold tracking-tight">
                      {c.CifKh}
                    </span>
                  )
                },
                {
                  key: 'kh',
                  label: 'Họ và Tên Khách hàng',
                  priority: 1,
                  render: c => (
                    <span className="font-bold text-ink text-xs group-hover:text-accent transition-colors">
                      {c.FullName}
                    </span>
                  )
                },
                {
                  key: 'sdt',
                  label: 'Số điện thoại',
                  priority: 2,
                  render: c => c.Phone ? (
                    <a
                      href={`tel:${c.Phone.replace(/\s+/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-mono text-ink-muted hover:text-accent flex items-center gap-1 text-xs"
                    >
                      <Phone className="w-3 h-3 text-ink-faint" />
                      <span>{formatPhoneNumber(c.Phone)}</span>
                    </a>
                  ) : (
                    <span className="text-ink-faint font-mono">—</span>
                  )
                },
                {
                  key: 'cccd',
                  label: 'Số CCCD',
                  priority: 2,
                  render: c => (
                    <div>
                      <div className="font-mono text-ink-muted text-xs font-semibold">
                        {formatNationalId(c.NationalId) || '—'}
                      </div>
                      {(c.IdCardIssueDate || c.IdCardIssuePlace) && (
                        <div className="text-[10px] text-ink-faint flex flex-wrap items-center gap-1 mt-0.5" title={`Cấp ngày: ${c.IdCardIssueDate ? fmtDate(c.IdCardIssueDate) : '—'} | Nơi cấp: ${c.IdCardIssuePlace || '—'}`}>
                          {c.IdCardIssueDate && <span>Cấp: {fmtDate(c.IdCardIssueDate)}</span>}
                          {c.IdCardIssueDate && c.IdCardIssuePlace && <span>•</span>}
                          {c.IdCardIssuePlace && <span className="truncate max-w-[140px]">{c.IdCardIssuePlace}</span>}
                        </div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'tienDo',
                  label: 'Tiến độ hồ sơ',
                  priority: 1,
                  render: c => <CustomerProgressCell progress={progressMap?.get(c.Id) ?? null} error={progressError} />
                },
                {
                  key: 'luuTru',
                  label: 'Ngày lưu trữ',
                  priority: 2,
                  align: 'center',
                  render: c => isCustomerArchived(c) ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-panel-muted border-line text-ink-faint whitespace-nowrap">
                      {fmtDate(String(c.ArchivedAt).slice(0, 10))}
                    </span>
                  ) : (
                    <span className="text-ink-faint">–</span>
                  )
                },
              ] as ColumnDef<Customer>[]).filter(col => !(statusFilter === 'active' && col.key === 'luuTru'))}
            />
          )}
        </div>
      </div>

      {/* Customer Modal Form Component */}
      <CustomerDrawerForm
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedCustomer={selectedCustomer}
        drawerTab={drawerTab}
        setDrawerTab={setDrawerTab}
        formState={formState}
        onSave={handleSaveCustomer}
        onDelete={handleDeleteCustomer}
        onParseSnippet={parseAndApplySnippet}
        canDelete={can('customer.deleteForever')}
        onArchive={selectedCustomer ? () => toggleArchived(selectedCustomer) : undefined}
        archiving={archiving === selectedCustomer?.Id}
      />
    </div>
  );
};
