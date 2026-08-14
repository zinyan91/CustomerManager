import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Customer } from '../types';
import { fetchCustomersAPI, saveCustomerAPI, deleteCustomerAPI, setCustomerArchivedAPI } from '../lib/api';
import {
  filterCustomersByStatus, countCustomersByStatus, isCustomerArchived,
  type CustomerStatusFilter,
} from '../lib/customerStatus';
import { validateCustomerForm, NATIONAL_ID_CCCD_LENGTH, PHONE_LENGTH, capDigits, capNumberList, normalizeNumberList } from '../lib/customerValidation';

export function useCustomerListController() {
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

  const showNotify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCustomersAPI({
        cif: searchCif,
        name: searchName,
        nationalId: searchNationalId,
      });
      data.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      setCustomers(data);
    } catch (err: any) {
      showNotify('error', `Lỗi nạp danh sách khách hàng: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [searchCif, searchName, searchNationalId, showNotify]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const statusCounts = useMemo(() => countCustomersByStatus(customers), [customers]);
  const visibleCustomers = useMemo(
    () => filterCustomersByStatus(customers, statusFilter),
    [customers, statusFilter]
  );

  const toggleArchived = useCallback(async (cus: Customer) => {
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
  }, [showNotify]);

  const clearForm = useCallback(() => {
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
  }, []);

  const openDrawerForCreate = useCallback(() => {
    clearForm();
    setDrawerTab('basic');
    setIsDrawerOpen(true);
  }, [clearForm]);

  const openDrawerForEdit = useCallback((cus: Customer) => {
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
  }, []);

  const handleSaveCustomer = useCallback(async (e: React.FormEvent) => {
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
  }, [
    inputCif, inputFullName, inputMaritalStatus, inputKhlqRelationship, inputSpouseName,
    inputNationalId, inputPhone, inputSpouseNationalId, inputSpousePhone, selectedCustomer,
    inputEmail, inputAddress, inputAccountNumber, inputCifKhlq, inputSpouseAccountNumber, inputKhlqAddress,
    showNotify, clearForm, fetchCustomers,
  ]);

  const handleDeleteCustomer = useCallback(async () => {
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
  }, [selectedCustomer, showNotify, clearForm, fetchCustomers]);

  return {
    customers,
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
    formState: {
      inputCif, setInputCif,
      inputFullName, setInputFullName,
      inputNationalId, setInputNationalId: (v: string) => setInputNationalId(capDigits(v, NATIONAL_ID_CCCD_LENGTH)),
      inputPhone, setInputPhone: (v: string) => setInputPhone(capNumberList(v, PHONE_LENGTH)),
      inputEmail, setInputEmail,
      inputAddress, setInputAddress,
      inputAccountNumber, setInputAccountNumber: (v: string) => setInputAccountNumber(normalizeNumberList(v)),
      inputMaritalStatus, setInputMaritalStatus,
      inputCifKhlq, setInputCifKhlq,
      inputKhlqRelationship, setInputKhlqRelationship,
      inputSpouseName, setInputSpouseName,
      inputSpouseNationalId, setInputSpouseNationalId: (v: string) => setInputSpouseNationalId(capDigits(v, NATIONAL_ID_CCCD_LENGTH)),
      inputSpousePhone, setInputSpousePhone: (v: string) => setInputSpousePhone(capNumberList(v, PHONE_LENGTH)),
      inputSpouseAccountNumber, setInputSpouseAccountNumber: (v: string) => setInputSpouseAccountNumber(normalizeNumberList(v)),
      inputKhlqAddress, setInputKhlqAddress,
    },
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
  };
}
