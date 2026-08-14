import React, { useEffect, useMemo, useState } from 'react';
import { UI, BTN_DANGER } from '../../lib/uiClasses';
import { fetchCustomersAPI, saveCustomerAPI, deleteCustomerAPI, setCustomerArchivedAPI } from '../../lib/api';
import type { Customer } from '../../types';
import {
  filterCustomersByStatus, countCustomersByStatus, isCustomerArchived,
  CUSTOMER_STATUS_LABEL, type CustomerStatusFilter,
} from '../../lib/customerStatus';
import { fmtDate, formatNationalId, parseNationalIdInput } from '../../lib/utils';
import {
  capDigits, capNumberList, normalizeNumberList, validateCustomerForm,
  NATIONAL_ID_CCCD_LENGTH, PHONE_LENGTH,
} from '../../lib/customerValidation';
import { Search, Plus, Trash2, X, UserCheck, Archive, ArchiveRestore, User, Users, Edit3 } from 'lucide-react';
import { Toast } from '../Toast';
import { AdaptiveTable, type AdaptiveColumn } from '../AdaptiveTable';

export const CustomerListView: React.FC = () => {

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'basic' | 'khlq'>('basic');

  const [searchCif, setSearchCif] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchNationalId, setSearchNationalId] = useState('');

  const [inputCif, setInputCif] = useState('');
  const [inputFullName, setInputFullName] = useState('');
  const [inputNationalId, setInputNationalId] = useState('');
  const [inputPhone, setInputPhone] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputAddress, setInputAddress] = useState('');
  const [inputAccountNumber, setInputAccountNumber] = useState('');
  const [inputMaritalStatus, setInputMaritalStatus] = useState('Độc thân');

  const [inputCifKhlq, setInputCifKhlq] = useState('');
  const [inputKhlqRelationship, setInputKhlqRelationship] = useState('Không có KHLQ');
  const [inputSpouseName, setInputSpouseName] = useState('');
  const [inputSpouseNationalId, setInputSpouseNationalId] = useState('');
  const [inputSpousePhone, setInputSpousePhone] = useState('');
  const [inputSpouseAccountNumber, setInputSpouseAccountNumber] = useState('');
  const [inputKhlqAddress, setInputKhlqAddress] = useState('');

  const [statusFilter, setStatusFilter] = useState<CustomerStatusFilter>('active');
  const [archiving, setArchiving] = useState<number | null>(null);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const statusCounts = useMemo(() => countCustomersByStatus(customers), [customers]);
  const visibleCustomers = useMemo(
    () => filterCustomersByStatus(customers, statusFilter),
    [customers, statusFilter]
  );

  const toggleArchived = async (cus: Customer) => {
    const archived = isCustomerArchived(cus);
    setArchiving(cus.Id);
    try {
      const saved = await setCustomerArchivedAPI(cus.Id, !archived);
      setCustomers(prev => prev.map(c => (c.Id === cus.Id ? { ...c, ArchivedAt: saved.ArchivedAt } : c)));
      showNotify('success', archived
        ? `Đã đưa hồ sơ ${cus.FullName} trở lại danh sách làm việc.`
        : `Đã lưu trữ hồ sơ ${cus.FullName}.`);
    } catch (err: any) {
      showNotify('error', err.message || 'Không đổi được trạng thái lưu trữ.');
    } finally {
      setArchiving(null);
    }
  };

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomersAPI({
        cif: searchCif,
        name: searchName,
        nationalId: searchNationalId
      });
      data.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      setCustomers(data);
    } catch (err: any) {
      showNotify('error', `Lỗi nạp danh sách khách hàng: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openDrawerForCreate = () => {
    clearForm();
    setDrawerTab('basic');
    setIsDrawerOpen(true);
  };

  const openDrawerForEdit = (cus: Customer) => {
    setSelectedCustomer(cus);
    setInputCif(cus.CifKh || '');
    setInputFullName(cus.FullName || '');
    setInputNationalId(cus.NationalId || '');
    setInputPhone(cus.Phone || '');
    setInputEmail(cus.Email || '');
    setInputAddress(cus.Address || '');
    setInputAccountNumber(cus.AccountNumber || '');
    setInputMaritalStatus(cus.MaritalStatus || 'Độc thân');
    setInputCifKhlq(cus.CifKhlq || '');
    setInputKhlqRelationship(cus.KhlqRelationship || (cus.MaritalStatus === 'Đã kết hôn' ? 'Vợ / Chồng' : 'Không có KHLQ'));
    setInputSpouseName(cus.SpouseName || '');
    setInputSpouseNationalId(cus.SpouseNationalId || '');
    setInputSpousePhone(cus.SpousePhone || '');
    setInputSpouseAccountNumber(cus.SpouseAccountNumber || '');
    setInputKhlqAddress(cus.KhlqAddress || '');
    setDrawerTab('basic');
    setIsDrawerOpen(true);
  };

  const clearForm = () => {
    setSelectedCustomer(null);
    setInputCif('');
    setInputFullName('');
    setInputNationalId('');
    setInputPhone('');
    setInputEmail('');
    setInputAddress('');
    setInputAccountNumber('');
    setInputMaritalStatus('Độc thân');
    setInputCifKhlq('');
    setInputKhlqRelationship('Không có KHLQ');
    setInputSpouseName('');
    setInputSpouseNationalId('');
    setInputSpousePhone('');
    setInputSpouseAccountNumber('');
    setInputKhlqAddress('');
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCif.trim() || !inputFullName.trim()) {
      showNotify('error', 'Mã CIF và Họ tên khách hàng là bắt buộc!');
      return;
    }

    if (inputMaritalStatus === 'Đã kết hôn' && inputKhlqRelationship === 'Vợ / Chồng' && !inputSpouseName.trim()) {
      showNotify('error', 'Trạng thái "Đã kết hôn" yêu cầu nhập Họ tên Vợ / Chồng!');
      return;
    }

    const loiSoLieu = validateCustomerForm({
      nationalId: inputNationalId,
      phone: inputPhone,
      spouseNationalId: inputSpouseNationalId,
      spousePhone: inputSpousePhone,
    });
    if (loiSoLieu.length > 0) {
      showNotify('error', loiSoLieu.join(' '));
      return;
    }

    const payload: Partial<Customer> = {
      Id: selectedCustomer?.Id,
      CifKh: inputCif.trim(),
      FullName: inputFullName.trim(),
      NationalId: inputNationalId.trim() || null,
      Phone: inputPhone.trim() || null,
      Email: inputEmail.trim() || null,
      Address: inputAddress.trim() || null,
      AccountNumber: inputAccountNumber.trim() || null,
      MaritalStatus: inputMaritalStatus,
      CifKhlq: inputCifKhlq.trim() || null,
      KhlqRelationship: inputKhlqRelationship || null,
      SpouseName: inputSpouseName.trim() || null,
      SpouseNationalId: inputSpouseNationalId.trim() || null,
      SpousePhone: inputSpousePhone.trim() || null,
      SpouseAccountNumber: inputSpouseAccountNumber.trim() || null,
      KhlqAddress: inputKhlqAddress.trim() || null,
    };

    try {
      await saveCustomerAPI(payload);
      showNotify('success', selectedCustomer ? 'Đã cập nhật hồ sơ KH!' : 'Đã lưu KH mới thành công!');
      setIsDrawerOpen(false);
      clearForm();
      fetchCustomers();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu trữ KH: ${err.message}`);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xoá Khách hàng "${selectedCustomer.FullName}" (CIF: ${selectedCustomer.CifKh})?`)) {
      return;
    }
    try {
      await deleteCustomerAPI(selectedCustomer.Id);
      showNotify('success', 'Đã xoá khách hàng thành công!');
      setIsDrawerOpen(false);
      clearForm();
      fetchCustomers();
    } catch (err: any) {
      showNotify('error', `Lỗi xoá khách hàng: ${err.message}`);
    }
  };

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
                    onClick={(e) => { e.stopPropagation(); openDrawerForEdit(c); }}
                    className="border border-line bg-panel text-ink-muted hover:border-accent hover:text-accent px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center space-x-1 transition-all duration-150 shadow-xs"
                  >
                    <Edit3 className="w-3 h-3 text-accent" />
                    <span>Sửa</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleArchived(c); }}
                    disabled={archiving === c.Id}
                    title={isCustomerArchived(c) ? 'Bỏ lưu trữ' : 'Lưu trữ hồ sơ'}
                    className="border border-line bg-panel text-ink-muted hover:border-accent hover:text-accent px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center transition-all duration-150 disabled:opacity-60"
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
                { key: 'cccd', label: 'Số CCCD/CMND', priority: 1,
                  render: c => <span className="font-mono text-ink-muted">{formatNationalId(c.NationalId) || '—'}</span> },
                { key: 'sdt', label: 'Số điện thoại', priority: 2,
                  render: c => <span className="font-mono">{c.Phone || '—'}</span> },
                { key: 'stk', label: 'Số tài khoản (STK)', priority: 2,
                  render: c => <span className="font-mono text-ink-muted">{c.AccountNumber || '—'}</span> },
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

      {/* Slide-Over Drawer Hồ Sơ Khách Hàng (Tập Trung & Phân Tab) */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity duration-200"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-panel border-l border-line-strong shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Drawer */}
            <div className="p-4 border-b border-line bg-panel-muted/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent-soft border border-accent/30 text-accent">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink uppercase tracking-tight">
                    {selectedCustomer ? `HỒ SƠ KHÁCH HÀNG: ${selectedCustomer.FullName}` : 'TẠO HỒ SƠ KHÁCH HÀNG MỚI'}
                  </h3>
                  <p className="text-[11px] text-ink-faint">
                    {selectedCustomer ? `Mã CIF: ${selectedCustomer.CifKh}` : 'Nhập đầy đủ thông tin cá nhân & người liên quan'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-panel transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation Drawer */}
            <div className="flex items-center border-b border-line px-4 bg-panel">
              <button
                type="button"
                onClick={() => setDrawerTab('basic')}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold transition-all ${
                  drawerTab === 'basic'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                <User className="w-4 h-4" />
                <span>1. Thông Tin Cá Nhân & Liên Lạc</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('khlq')}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold transition-all ${
                  drawerTab === 'khlq'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>2. Hôn Nhân & Người Liên Quan (KHLQ)</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveCustomer} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {drawerTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Mã CIF KH *</label>
                      <input
                        type="text"
                        required
                        placeholder="005299617..."
                        value={inputCif}
                        onChange={(e) => setInputCif(e.target.value)}
                        className={`w-full rounded-lg p-2.5 font-mono font-bold text-accent ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Số CCCD / CMND</label>
                      <input
                        type="text"
                        placeholder="0700 9100..."
                        inputMode="numeric"
                        value={formatNationalId(inputNationalId)}
                        onChange={(e) => setInputNationalId(capDigits(e.target.value, NATIONAL_ID_CCCD_LENGTH))}
                        className={`w-full rounded-lg p-2.5 font-mono font-semibold ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-ink">Họ và Tên Khách hàng *</label>
                    <input
                      type="text"
                      required
                      placeholder="ĐỊNH TIÊN HOÀNG..."
                      value={inputFullName}
                      onChange={(e) => setInputFullName(e.target.value)}
                      className={`w-full rounded-lg p-2.5 font-bold text-sm text-ink ${inputStyle}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Số điện thoại</label>
                      <input
                        type="text"
                        placeholder="0909123456 / 0912345678..."
                        value={inputPhone}
                        onChange={(e) => setInputPhone(capNumberList(e.target.value, PHONE_LENGTH))}
                        className={`w-full rounded-lg p-2.5 font-mono ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Số tài khoản (STK) KH</label>
                      <input
                        type="text"
                        placeholder="190333... / 190444..."
                        value={inputAccountNumber}
                        onChange={(e) => setInputAccountNumber(normalizeNumberList(e.target.value))}
                        className={`w-full rounded-lg p-2.5 font-mono font-bold text-ink ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-ink">Địa chỉ email</label>
                    <input
                      type="email"
                      placeholder="khachhang@gmail.com..."
                      value={inputEmail}
                      onChange={(e) => setInputEmail(e.target.value)}
                      className={`w-full rounded-lg p-2.5 ${inputStyle}`}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-ink">Địa chỉ liên lạc thường trú</label>
                    <textarea
                      rows={3}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                      value={inputAddress}
                      onChange={(e) => setInputAddress(e.target.value)}
                      className={`w-full rounded-lg p-2.5 ${inputStyle}`}
                    />
                  </div>
                </div>
              )}

              {drawerTab === 'khlq' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Tình trạng hôn nhân *</label>
                      <select
                        value={inputMaritalStatus}
                        onChange={(e) => setInputMaritalStatus(e.target.value)}
                        className={`w-full rounded-lg p-2.5 font-semibold ${inputStyle}`}
                      >
                        <option value="Độc thân">Độc thân</option>
                        <option value="Đã kết hôn">Đã kết hôn</option>
                        <option value="Ly hôn">Ly hôn</option>
                        <option value="Góa">Góa</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-ink">Mối quan hệ KHLQ / Bảo lãnh *</label>
                      <select
                        value={inputKhlqRelationship}
                        onChange={(e) => setInputKhlqRelationship(e.target.value)}
                        className={`w-full rounded-lg p-2.5 font-bold text-accent ${inputStyle}`}
                      >
                        <option value="Vợ / Chồng">Vợ / Chồng</option>
                        <option value="Người bảo lãnh">Người bảo lãnh thanh toán</option>
                        <option value="Bên bảo đảm (Chủ TSĐB)">Bên bảo đảm (Chủ TSĐB)</option>
                        <option value="Bố / Mẹ">Bố / Mẹ</option>
                        <option value="Con cái">Con cái</option>
                        <option value="Đại diện pháp luật">Đại diện pháp luật / Chủ DN</option>
                        <option value="Khác">Khác / Người liên quan</option>
                        <option value="Không có KHLQ">Không có KHLQ</option>
                      </select>
                    </div>
                  </div>

                  {inputKhlqRelationship !== 'Không có KHLQ' && (
                    <div className="space-y-4 pt-3 border-t border-line">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold mb-1 text-ink">Mã CIF KHLQ / Người bảo lãnh</label>
                          <input
                            type="text"
                            placeholder="005236684..."
                            value={inputCifKhlq}
                            onChange={(e) => setInputCifKhlq(e.target.value)}
                            className={`w-full rounded-lg p-2.5 font-mono font-bold text-accent ${inputStyle}`}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1 text-ink">Họ tên KHLQ / Người bảo lãnh</label>
                          <input
                            type="text"
                            placeholder="Họ tên Vợ/Chồng hoặc Người bảo lãnh..."
                            value={inputSpouseName}
                            onChange={(e) => setInputSpouseName(e.target.value)}
                            className={`w-full rounded-lg p-2.5 font-bold text-ink ${inputStyle}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold mb-1 text-ink">Số CCCD KHLQ / Bảo lãnh</label>
                          <input
                            type="text"
                            placeholder="Số CCCD..."
                            inputMode="numeric"
                            value={formatNationalId(inputSpouseNationalId)}
                            onChange={(e) => setInputSpouseNationalId(capDigits(e.target.value, NATIONAL_ID_CCCD_LENGTH))}
                            className={`w-full rounded-lg p-2.5 font-mono ${inputStyle}`}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1 text-ink">SĐT KHLQ / Bảo lãnh</label>
                          <input
                            type="text"
                            placeholder="SĐT, nhiều số cách nhau bằng /"
                            value={inputSpousePhone}
                            onChange={(e) => setInputSpousePhone(capNumberList(e.target.value, PHONE_LENGTH))}
                            className={`w-full rounded-lg p-2.5 font-mono ${inputStyle}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-semibold mb-1 text-ink">STK KHLQ / Bảo lãnh</label>
                          <input
                            type="text"
                            placeholder="Số tài khoản..."
                            value={inputSpouseAccountNumber}
                            onChange={(e) => setInputSpouseAccountNumber(normalizeNumberList(e.target.value))}
                            className={`w-full rounded-lg p-2.5 font-mono font-bold text-ink ${inputStyle}`}
                          />
                        </div>
                        <div>
                          <label className="block font-semibold mb-1 text-ink">Địa chỉ KHLQ / Bảo lãnh</label>
                          <input
                            type="text"
                            placeholder="Địa chỉ..."
                            value={inputKhlqAddress}
                            onChange={(e) => setInputKhlqAddress(e.target.value)}
                            className={`w-full rounded-lg p-2.5 ${inputStyle}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Sticky Actions trong Drawer */}
              <div className="border-t border-line pt-4 flex items-center justify-between gap-3 sticky bottom-0 bg-panel">
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={handleDeleteCustomer}
                    className={`${BTN_DANGER} text-xs py-2.5 px-4 rounded-lg flex items-center space-x-1.5`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>XOÁ KHÁCH HÀNG</span>
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2.5 rounded-lg border border-line bg-panel-muted text-ink-muted hover:text-ink font-semibold text-xs transition-colors"
                  >
                    HỦY BỎ
                  </button>
                  <button
                    type="submit"
                    className="bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-2.5 px-5 rounded-lg transition-all shadow-xs"
                  >
                    {selectedCustomer ? 'CẬP NHẬT HỒ SƠ' : 'LƯU HỒ SƠ MỚI'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
