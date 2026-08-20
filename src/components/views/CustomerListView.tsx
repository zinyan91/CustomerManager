import React from 'react';
import { useNavigate } from 'react-router';
import { UI } from '../../lib/uiClasses';
import type { Customer } from '../../types';
import { isCustomerArchived, CUSTOMER_STATUS_LABEL, type CustomerStatusFilter } from '../../lib/customerStatus';
import { fmtDate, formatNationalId, parseNationalIdInput } from '../../lib/utils';
import { Search, Plus, UserCheck, Archive, ArchiveRestore, Edit3, FileText, Banknote, Building2 } from 'lucide-react';
import { Toast } from '../Toast';
import { AdaptiveTable, type AdaptiveColumn } from '../AdaptiveTable';
import { useCustomerListController } from '../../hooks/useCustomerListController';
import { CustomerDrawerForm } from '../customer/CustomerDrawerForm';
import { customerPath } from '../../lib/customerRoutes';

export const CustomerListView: React.FC = () => {
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

  const navigate = useNavigate();

  const containerCardBg = UI.containerCardBg;
  const inputStyle = UI.inputStyle;

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Header Tra cứu & Hành động */}
      <div className={`${containerCardBg} p-4 rounded-xl border border-line shadow-sm space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-accent tracking-tight flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-accent" />
            <span>TRA CỨU & QUẢN LÝ DANH SÁCH KHÁCH HÀNG</span>
          </div>
          <button
            type="button"
            onClick={openDrawerForCreate}
            className="bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-2 px-3.5 rounded-lg flex items-center space-x-1.5 transition-all duration-150 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>THÊM KHÁCH HÀNG MỚI</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Mã CIF KH..."
            value={searchCif}
            onChange={(e) => setSearchCif(e.target.value)}
            className={`rounded-lg px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Họ tên Khách hàng..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className={`rounded-lg px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Số CCCD KH..."
            value={formatNationalId(searchNationalId)}
            onChange={(e) => setSearchNationalId(parseNationalIdInput(e.target.value))}
            className={`rounded-lg px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <button
            onClick={fetchCustomers}
            className="bg-panel-muted hover:bg-line border border-line text-ink font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all duration-150"
          >
            <Search className="w-3.5 h-3.5 text-accent" />
            <span>TÌM KIẾM HỒ SƠ</span>
          </button>
        </div>
      </div>

      {/* Bảng Dữ Liệu Full-Width */}
      <div className={`${containerCardBg} rounded-xl overflow-hidden border border-line shadow-sm flex flex-col`}>
        <div className={`p-3.5 border-b space-y-2.5 bg-panel border-line flex flex-wrap items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-ink tracking-tight">
              DANH SÁCH KHÁCH HÀNG ({visibleCustomers.length})
            </span>
            <div className="flex items-center gap-1.5">
              {(['active', 'archived', 'ALL'] as CustomerStatusFilter[]).map(s => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all duration-150 ${
                    statusFilter === s
                      ? 'bg-accent text-accent-ink border-accent shadow-xs'
                      : 'bg-panel-muted text-ink-muted border-line hover:text-ink hover:border-line-strong'
                  }`}>
                  {CUSTOMER_STATUS_LABEL[s]} ({statusCounts[s]})
                </button>
              ))}
            </div>
          </div>
          <span className="text-[11px] text-ink-faint">Bấm nút "Chỉnh sửa" để cập nhật thông tin</span>
        </div>

        <div className="overflow-auto min-h-[420px]">
          {loading ? (
            <div className="text-center p-12 text-ink-faint text-xs">Đang tải dữ liệu khách hàng...</div>
          ) : (
            <AdaptiveTable
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
                      navigate(customerPath('credit-contracts', c.Id));
                    }}
                    title="Xem Hợp đồng tín dụng & hạn mức của KH này"
                    className="border border-line bg-panel text-ink-muted hover:border-accent hover:text-accent px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1 transition-all duration-150 shadow-xs"
                  >
                    <FileText className="w-3 h-3 text-accent" />
                    <span>HĐTD</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(customerPath('loans', c.Id));
                    }}
                    title="Xem Danh mục Khoản vay & Lịch thu nợ của KH này"
                    className="border border-line bg-panel text-ink-muted hover:border-accent hover:text-accent px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1 transition-all duration-150 shadow-xs"
                  >
                    <Banknote className="w-3 h-3 text-pos" />
                    <span>Vay</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(customerPath('collaterals', c.Id));
                    }}
                    title="Xem Tài sản bảo đảm thế chấp của KH này"
                    className="border border-line bg-panel text-ink-muted hover:border-accent hover:text-accent px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1 transition-all duration-150 shadow-xs"
                  >
                    <Building2 className="w-3 h-3 text-warn" />
                    <span>TSBĐ</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openDrawerForEdit(c); }}
                    className="border border-line bg-panel text-ink-muted hover:border-accent hover:text-accent px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1 transition-all duration-150 shadow-xs"
                  >
                    <Edit3 className="w-3 h-3 text-accent" />
                    <span>Sửa</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleArchived(c); }}
                    disabled={archiving === c.Id}
                    title={isCustomerArchived(c) ? 'Bỏ lưu trữ' : 'Lưu trữ hồ sơ'}
                    className="border border-line bg-panel text-ink-muted hover:border-accent hover:text-accent px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center transition-all duration-150 disabled:opacity-60"
                  >
                    {isCustomerArchived(c)
                      ? <ArchiveRestore className="w-3 h-3 text-pos" />
                      : <Archive className="w-3 h-3" />}
                  </button>
                </div>
              )}
              columns={([
                { key: 'cif', label: 'Mã CIF', priority: 1,
                  render: c => <span className="font-mono text-accent font-bold">{c.CifKh}</span> },
                { key: 'ten', label: 'Họ và tên KH', priority: 1,
                  render: c => <span className="font-bold text-ink text-xs">{c.FullName}</span> },
                { key: 'sdt', label: 'Số điện thoại', priority: 2,
                  render: c => <span className="font-mono">{c.Phone || '—'}</span> },
                { key: 'khlq', label: 'KHLQ / Vợ chồng', priority: 2,
                  render: c => c.SpouseName
                    ? <span className="text-ink font-semibold">{c.SpouseName}</span>
                    : <span className="text-ink-faint">–</span> },
                { key: 'quanHe', label: 'Phân loại KHLQ', priority: 1,
                  render: c => {
                    const rel = c.KhlqRelationship || (c.MaritalStatus === 'Đã kết hôn' ? 'Vợ / Chồng' : 'Không có');
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        rel === 'Vợ / Chồng' ? 'bg-accent-soft border-accent/30 text-accent'
                        : rel === 'Người bảo lãnh' ? 'bg-pos-soft border-pos/30 text-pos'
                        : rel === 'Bên bảo đảm (Chủ TSĐB)' ? 'bg-warn-soft border-warn/30 text-warn'
                        : 'bg-panel-muted border-line text-ink-muted'
                      }`}>{rel}</span>
                    );
                  } },
                { key: 'luuTru', label: 'Ngày lưu trữ', priority: 2, align: 'center',
                  render: c => isCustomerArchived(c)
                    ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-panel-muted border-line text-ink-faint whitespace-nowrap">
                        {fmtDate(String(c.ArchivedAt).slice(0, 10))}
                      </span>
                    )
                    : <span className="text-ink-faint">–</span> },
              ] as AdaptiveColumn<Customer>[]).filter(col => !(statusFilter === 'active' && col.key === 'luuTru'))}
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
      />
    </div>
  );
};
