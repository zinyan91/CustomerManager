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
  capDigits, validateCustomerForm,
  NATIONAL_ID_CCCD_LENGTH, PHONE_LENGTH,
} from '../../lib/customerValidation';
import { Search, Plus, Eye, Trash2, X, UserCheck, Archive, ArchiveRestore } from 'lucide-react';
import { Toast } from '../Toast';
import { AdaptiveTable, type AdaptiveColumn } from '../AdaptiveTable';

export const CustomerListView: React.FC = () => {

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleSelectCustomer = (cus: Customer) => {
    if (selectedCustomer?.Id === cus.Id) {
      clearForm();
      return;
    }
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

      <div className={`${containerCardBg} p-4 rounded-lg border space-y-3`}>
        <div className="text-xs font-bold text-accent tracking-tight">
          TRA CỨU & QUẢN LÝ DANH SÁCH KHÁCH HÀNG
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Mã CIF KH..."
            value={searchCif}
            onChange={(e) => setSearchCif(e.target.value)}
            className={`rounded-md px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Họ tên Khách hàng..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className={`rounded-md px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <input
            type="text"
            placeholder="Số CCCD KH..."
            value={formatNationalId(searchNationalId)}
            onChange={(e) => setSearchNationalId(parseNationalIdInput(e.target.value))}
            className={`rounded-md px-3 py-2 text-xs transition-colors ${inputStyle}`}
          />
          <button
            onClick={fetchCustomers}
            className="bg-accent hover:opacity-90 text-accent-ink font-semibold text-xs py-2 px-3 rounded-md flex items-center justify-center space-x-1.5 transition-opacity duration-150"
          >
            <Search className="w-3.5 h-3.5" />
            <span>TÌM KIẾM</span>
          </button>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className={`${containerCardBg} lg:col-span-7 rounded-lg overflow-hidden border flex flex-col h-[calc(100vh-215px)]`}>
          <div className={`p-3 border-b space-y-2 bg-panel border-line`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">
                DANH SÁCH KHÁCH HÀNG ({visibleCustomers.length})
              </span>
              <span className="text-[11px] text-ink-faint">Bấm vào dòng để chọn/chỉnh sửa</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['active', 'archived', 'ALL'] as CustomerStatusFilter[]).map(s => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                    statusFilter === s
                      ? 'bg-accent text-accent-ink border-accent'
                      : 'bg-panel-muted text-ink-muted border-line'
                  }`}>
                  {CUSTOMER_STATUS_LABEL[s]} ({statusCounts[s]})
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-auto flex-1">
            {loading ? (
              <div className="text-center p-8 text-ink-faint text-xs">Đang tải dữ liệu khách hàng...</div>
            ) : (
              <AdaptiveTable
                rows={visibleCustomers}
                rowKey={c => c.Id}
                onRowClick={handleSelectCustomer}
                isSelected={c => selectedCustomer?.Id === c.Id}
                emptyText={statusFilter === 'archived'
                  ? 'Chưa có hồ sơ nào được lưu trữ.'
                  : 'Không tìm thấy khách hàng nào.'}
                cardTitle={c => c.FullName}
                cardSubtitle={c => c.CifKh}
                actions={c => (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDetailCustomer(c); setIsModalOpen(true); }}
                      className="border border-line text-ink-muted hover:border-accent hover:text-accent px-2 py-1 rounded-md text-[11px] font-semibold inline-flex items-center space-x-1 transition-colors duration-150"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Xem</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleArchived(c); }}
                      disabled={archiving === c.Id}
                      title={isCustomerArchived(c) ? 'Bỏ lưu trữ' : 'Lưu trữ hồ sơ'}
                      className="border border-line text-ink-muted hover:border-accent hover:text-accent px-2 py-1 rounded-md text-[11px] font-semibold inline-flex items-center transition-colors duration-150 disabled:opacity-60"
                    >
                      {isCustomerArchived(c)
                        ? <ArchiveRestore className="w-3 h-3" />
                        : <Archive className="w-3 h-3" />}
                    </button>
                  </div>
                )}
                columns={([
          { key: 'cif', label: 'Mã CIF', priority: 1,
                    render: c => <span className="font-mono text-ink font-semibold">{c.CifKh}</span> },
          { key: 'ten', label: 'Họ và tên KH', priority: 1,
                    render: c => <span className="font-bold">{c.FullName}</span> },
          { key: 'khlq', label: 'KHLQ / Người bảo lãnh', priority: 2,
                    render: c => c.SpouseName
                      ? <span className="text-ink">{c.SpouseName}</span>
                      : <span className="text-ink-faint">–</span> },
          { key: 'luuTru', label: 'Lưu trữ', priority: 2, align: 'center',
                    render: c => isCustomerArchived(c)
                      ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-panel-muted border-line text-ink-faint whitespace-nowrap">
                          {fmtDate(String(c.ArchivedAt).slice(0, 10))}
                        </span>
                      )
                      : <span className="text-ink-faint">–</span> },
          { key: 'quanHe', label: 'Mối quan hệ', priority: 1,
                    render: c => {
                      const rel = c.KhlqRelationship || (c.MaritalStatus === 'Đã kết hôn' ? 'Vợ / Chồng' : 'Không có');
                      return (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          rel === 'Vợ / Chồng' ? 'bg-accent-soft border-accent/30 text-accent'
                          : rel === 'Người bảo lãnh' ? 'bg-pos-soft border-pos/30 text-pos'
                          : rel === 'Bên bảo đảm (Chủ TSĐB)' ? 'bg-warn-soft border-warn/30 text-warn'
                          : 'bg-panel-muted border-line text-ink-muted'
                        }`}>{rel}</span>
                      );
                    } },
        ] as AdaptiveColumn<Customer>[]).filter(col => !(statusFilter === 'active' && col.key === 'luuTru'))}
              />
            )}
          </div>
        </div>

        <div className={`${containerCardBg} lg:col-span-5 rounded-lg p-5 border overflow-y-auto max-h-[calc(100vh-215px)] space-y-4`}>
          <div className={`flex items-center justify-between border-b pb-3 border-line`}>
            <h3 className="text-sm font-bold flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-accent" />
              <span>{selectedCustomer ? 'CẬP NHẬT HỒ SƠ KHÁCH HÀNG' : 'THÊM KHÁCH HÀNG MỚI'}</span>
            </h3>
            <button onClick={clearForm} className="text-xs text-accent hover:underline font-semibold flex items-center space-x-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo mới</span>
            </button>
          </div>

          <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Mã CIF KH *</label>
                <input
                  type="text"
                  required
                  placeholder="005299617..."
                  value={inputCif}
                  onChange={(e) => setInputCif(e.target.value)}
                  className={`w-full rounded-md p-2.5 font-mono font-bold text-ink ${inputStyle}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Số CCCD / CMND</label>
                <input
                  type="text"
                  placeholder="0700 9100..."
                  inputMode="numeric"
                  value={formatNationalId(inputNationalId)}
                  onChange={(e) => setInputNationalId(capDigits(e.target.value, NATIONAL_ID_CCCD_LENGTH))}
                  className={`w-full rounded-md p-2.5 font-mono font-bold ${inputStyle}`}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Họ và Tên Khách hàng *</label>
              <input
                type="text"
                required
                placeholder="ĐỊNH TIÊN HOÀNG..."
                value={inputFullName}
                onChange={(e) => setInputFullName(e.target.value)}
                className={`w-full rounded-md p-2.5 font-bold text-sm ${inputStyle}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Số điện thoại</label>
                <input
                  type="text"
                  placeholder="0909123456..."
                  inputMode="numeric"
                  value={inputPhone}
                  onChange={(e) => setInputPhone(capDigits(e.target.value, PHONE_LENGTH))}
                  className={`w-full rounded-md p-2.5 ${inputStyle}`}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Số tài khoản (STK) KH</label>
                <input
                  type="text"
                  placeholder="190333..."
                  value={inputAccountNumber}
                  onChange={(e) => setInputAccountNumber(e.target.value)}
                  className={`w-full rounded-md p-2.5 font-mono font-bold text-ink ${inputStyle}`}
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Địa chỉ liên lạc</label>
              <input
                type="text"
                placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
                className={`w-full rounded-md p-2.5 ${inputStyle}`}
              />
            </div>

            <div className={`rounded-md p-4 space-y-3 border ${'bg-surface border-line'
              }`}>
              <div className="text-xs font-bold text-accent uppercase border-b border-line pb-2 flex items-center justify-between">
                <span>THÔNG TIN HÔN NHÂN & KHÁCH HÀNG LIÊN QUAN / BẢO LÃNH</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tình trạng hôn nhân *</label>
                  <select
                    value={inputMaritalStatus}
                    onChange={(e) => setInputMaritalStatus(e.target.value)}
                    className={`w-full rounded-md p-2.5 font-medium ${inputStyle}`}
                  >
                    <option value="Độc thân">Độc thân</option>
                    <option value="Đã kết hôn">Đã kết hôn</option>
                    <option value="Ly hôn">Ly hôn</option>
                    <option value="Góa">Góa</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Mối quan hệ KHLQ / Bảo lãnh *</label>
                  <select
                    value={inputKhlqRelationship}
                    onChange={(e) => setInputKhlqRelationship(e.target.value)}
                    className={`w-full rounded-md p-2.5 font-bold text-ink ${inputStyle}`}
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
                <div className="space-y-3 pt-2 border-t border-line">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Mã CIF KHLQ / Người bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="005236684..."
                        value={inputCifKhlq}
                        onChange={(e) => setInputCifKhlq(e.target.value)}
                        className={`w-full rounded-md p-2.5 font-mono font-bold ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Họ tên KHLQ / Người bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Họ tên Vợ/Chồng hoặc Người bảo lãnh..."
                        value={inputSpouseName}
                        onChange={(e) => setInputSpouseName(e.target.value)}
                        className={`w-full rounded-md p-2.5 font-bold ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">Số CCCD KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Số CCCD..."
                        inputMode="numeric"
                        value={formatNationalId(inputSpouseNationalId)}
                        onChange={(e) => setInputSpouseNationalId(capDigits(e.target.value, NATIONAL_ID_CCCD_LENGTH))}
                        className={`w-full rounded-md p-2.5 font-mono ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">SĐT KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="SĐT..."
                        inputMode="numeric"
                        value={inputSpousePhone}
                        onChange={(e) => setInputSpousePhone(capDigits(e.target.value, PHONE_LENGTH))}
                        className={`w-full rounded-md p-2.5 ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium mb-1">STK KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Số tài khoản..."
                        value={inputSpouseAccountNumber}
                        onChange={(e) => setInputSpouseAccountNumber(e.target.value)}
                        className={`w-full rounded-md p-2.5 font-mono font-bold text-ink ${inputStyle}`}
                      />
                    </div>
                    <div>
                      <label className="block font-medium mb-1">Địa chỉ KHLQ / Bảo lãnh</label>
                      <input
                        type="text"
                        placeholder="Địa chỉ..."
                        value={inputKhlqAddress}
                        onChange={(e) => setInputKhlqAddress(e.target.value)}
                        className={`w-full rounded-md p-2.5 ${inputStyle}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="submit"
                className="flex-1 bg-accent hover:opacity-90 text-accent-ink font-bold text-xs py-3 px-4 rounded-md transition-opacity duration-150"
              >
                {selectedCustomer ? 'CẬP NHẬT HỒ SƠ KHÁCH HÀNG' : 'LƯU HỒ SƠ KHÁCH HÀNG MỚI'}
              </button>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={handleDeleteCustomer}
                  className={`${BTN_DANGER} text-xs py-3 px-4 flex items-center space-x-1`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>XOÁ KH</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {isModalOpen && detailCustomer && (
        <div className="fixed inset-0 z-50 bg-surface/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${containerCardBg} w-full max-w-2xl rounded-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between border-b pb-3 border-line`}>
              <div>
                <h3 className="text-base font-bold text-accent">
                  HỒ SƠ CHI TIẾT: {detailCustomer.FullName}
                </h3>
                <p className="text-xs text-ink-faint">Mã CIF: {detailCustomer.CifKh}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-ink-faint hover:text-ink rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-accent uppercase">1. Thông Tin Pháp Lý & Liên Lạc KH</h4>
              <div className={`border rounded-md p-4 grid grid-cols-2 gap-3 text-xs bg-surface border-line`}>
                <div><span className="text-ink-faint">Họ và tên:</span> <span className="font-bold text-ink">{detailCustomer.FullName}</span></div>
                <div><span className="text-ink-faint">Số CCCD:</span> <span className="font-bold font-mono">{formatNationalId(detailCustomer.NationalId) || 'Chưa khai báo'}</span></div>
                <div><span className="text-ink-faint">Số tài khoản (STK):</span> <span className="font-bold font-mono text-ink">{detailCustomer.AccountNumber || 'Chưa khai báo'}</span></div>
                <div><span className="text-ink-faint">Số điện thoại:</span> <span className="font-bold">{detailCustomer.Phone || 'Chưa khai báo'}</span></div>
                <div className="col-span-2"><span className="text-ink-faint">Địa chỉ:</span> <span>{detailCustomer.Address || 'Chưa khai báo'}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-accent uppercase">2. Thông Tin Hôn Nhân & KHLQ / Người Bảo Lãnh</h4>
              <div className={`border rounded-md p-4 grid grid-cols-2 gap-3 text-xs bg-surface border-line`}>
                <div><span className="text-ink-faint">Tình trạng hôn nhân:</span> <span className="font-bold">{detailCustomer.MaritalStatus}</span></div>
                <div><span className="text-ink-faint">Mối quan hệ KHLQ:</span> <span className="font-bold text-ink">{detailCustomer.KhlqRelationship || (detailCustomer.MaritalStatus === 'Đã kết hôn' ? 'Vợ / Chồng' : 'Không có')}</span></div>
                <div><span className="text-ink-faint">Mã CIF KHLQ:</span> <span className="font-bold font-mono text-ink">{detailCustomer.CifKhlq || '—'}</span></div>
                <div><span className="text-ink-faint">Họ tên KHLQ / Bảo lãnh:</span> <span className="font-bold">{detailCustomer.SpouseName || '—'}</span></div>
                <div><span className="text-ink-faint">STK KHLQ / Bảo lãnh:</span> <span className="font-bold font-mono text-ink">{detailCustomer.SpouseAccountNumber || '—'}</span></div>
                <div><span className="text-ink-faint">CCCD KHLQ / Bảo lãnh:</span> <span className="font-mono">{formatNationalId(detailCustomer.SpouseNationalId) || '—'}</span></div>
                <div><span className="text-ink-faint">SĐT KHLQ / Bảo lãnh:</span> <span>{detailCustomer.SpousePhone || '—'}</span></div>
                <div className="col-span-2"><span className="text-ink-faint">Địa chỉ KHLQ / Bảo lãnh:</span> <span>{detailCustomer.KhlqAddress || '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
