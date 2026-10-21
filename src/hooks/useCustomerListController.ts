import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Customer } from '../types';
import { fetchCustomersAPI, saveCustomerAPI, deleteCustomerAPI, setCustomerArchivedAPI } from '../lib/api';
import {
  filterCustomersByStatus, countCustomersByStatus, isCustomerArchived,
  type CustomerStatusFilter,
} from '../lib/customerStatus';
import { validateCustomerForm, NATIONAL_ID_CCCD_LENGTH, PHONE_LENGTH,
  capDigits, capNumberList, normalizeNumberList, parseRawCustomerText,
} from '../lib/customerValidation';
import { useConfirm } from '../context/ConfirmContext';
import { useUserScope } from '../context/UserScopeContext';
import { useAuth } from '../context/AuthContext';

export function useCustomerListController() {
  const { can } = useAuth();
  const { ownerScope, managedUsers } = useUserScope();
  const canAssignOwner = can('customer.assign');
  // KH tạo mới mặc định thuộc tài khoản đang xem; để trống thì API gán cho chính người tạo
  const defaultOwnerId = ownerScope.kind === 'user' ? ownerScope.userId : '';
  const ownerOptions = useMemo(
    () => managedUsers.filter((u) => u.role !== 'unassigned').map((u) => ({ userId: u.userId, fullName: u.fullName })),
    [managedUsers]
  );
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
  const [inputIdCardIssueDate, setInputIdCardIssueDate] = useState('');
  const [inputIdCardIssuePlace, setInputIdCardIssuePlace] = useState('');
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
  const [inputOwnerId, setInputOwnerId] = useState('');

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

  // Phạm vi tài khoản đã được lọc ở server (lib/api đọc ownerScopeStore)
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
      setSelectedCustomer(prev => prev?.Id === cus.Id ? { ...prev, ArchivedAt: saved.ArchivedAt } : prev);
      setIsDrawerOpen(false);
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
    setInputIdCardIssueDate('');
    setInputIdCardIssuePlace('');
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
    setInputOwnerId('');
  }, []);

  const openDrawerForCreate = useCallback(() => {
    clearForm();
    setInputOwnerId(defaultOwnerId);
    setDrawerTab('basic');
    setIsDrawerOpen(true);
  }, [clearForm, defaultOwnerId]);

  const openDrawerForEdit = useCallback((cus: Customer) => {
    setSelectedCustomer(cus);
    setInputCif(cus.CifKh || '');
    setInputFullName(cus.FullName || '');
    setInputNationalId(cus.NationalId || '');
    const rawIssueDate = cus.IdCardIssueDate || '';
    setInputIdCardIssueDate(rawIssueDate.includes('T') ? rawIssueDate.split('T')[0] : rawIssueDate);
    setInputIdCardIssuePlace(cus.IdCardIssuePlace || '');
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
    setInputOwnerId(cus.OwnerId || '');
    setDrawerTab('basic');
    setIsDrawerOpen(true);
  }, []);

  const parseAndApplySnippet = useCallback((raw: string) => {
    const parsed = parseRawCustomerText(raw);
    let appliedCount = 0;
    if (parsed.cif) { setInputCif(parsed.cif); appliedCount++; }
    if (parsed.fullName) { setInputFullName(parsed.fullName.toUpperCase()); appliedCount++; }
    if (parsed.nationalId) { setInputNationalId(capDigits(parsed.nationalId, NATIONAL_ID_CCCD_LENGTH)); appliedCount++; }
    if (parsed.idCardIssueDate) { setInputIdCardIssueDate(parsed.idCardIssueDate); appliedCount++; }
    if (parsed.idCardIssuePlace) { setInputIdCardIssuePlace(parsed.idCardIssuePlace); appliedCount++; }
    if (parsed.phone) { setInputPhone(capNumberList(parsed.phone, PHONE_LENGTH)); appliedCount++; }
    if (parsed.email) { setInputEmail(parsed.email); appliedCount++; }
    if (parsed.accountNumber) { setInputAccountNumber(normalizeNumberList(parsed.accountNumber)); appliedCount++; }
    if (parsed.address) { setInputAddress(parsed.address); appliedCount++; }

    if (appliedCount > 0) {
      showNotify('success', `Đã tự động nhận diện và điền ${appliedCount} trường thông tin!`);
    } else {
      showNotify('error', 'Không nhận diện được định dạng thông tin từ văn bản.');
    }
  }, [showNotify]);

  const handleSaveCustomer = useCallback(async (e?: React.FormEvent, options?: { continueAdding?: boolean }) => {
    if (e) e.preventDefault();
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
      FullName: inputFullName.trim().toUpperCase(),
      NationalId: inputNationalId.trim() || null,
      IdCardIssueDate: inputIdCardIssueDate.trim() || null,
      IdCardIssuePlace: inputIdCardIssuePlace.trim() || null,
      Phone: inputPhone.trim() || null,
      Email: inputEmail.trim() || null,
      Address: inputAddress.trim() || null,
      AccountNumber: inputAccountNumber.trim() || null,
      MaritalStatus: inputMaritalStatus,
      CifKhlq: inputCifKhlq.trim() || null,
      KhlqRelationship: inputKhlqRelationship || null,
      SpouseName: inputSpouseName.trim().toUpperCase() || null,
      SpouseNationalId: inputSpouseNationalId.trim() || null,
      SpousePhone: inputSpousePhone.trim() || null,
      SpouseAccountNumber: inputSpouseAccountNumber.trim() || null,
      KhlqAddress: inputKhlqAddress.trim() || null,
      // Chỉ người có quyền gán mới đổi được người phụ trách; để trống thì giữ nguyên
      ...(canAssignOwner && inputOwnerId ? { OwnerId: inputOwnerId } : {}),
    };

    try {
      await saveCustomerAPI(payload);
      showNotify('success', selectedCustomer ? 'Đã CẬP NHẬT thành công hồ sơ!' : 'Đã TẠO MỚI thành công hồ sơ KH!');
      if (options?.continueAdding) {
        clearForm();
        setInputOwnerId(defaultOwnerId);
      } else {
        setIsDrawerOpen(false);
        clearForm();
      }
      fetchCustomers();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu trữ KH: ${err.message}`);
    }
  }, [
    inputCif, inputFullName, inputMaritalStatus, inputKhlqRelationship, inputSpouseName,
    inputNationalId, inputIdCardIssueDate, inputIdCardIssuePlace, inputPhone, inputSpouseNationalId, inputSpousePhone, selectedCustomer,
    inputEmail, inputAddress, inputAccountNumber, inputCifKhlq, inputSpouseAccountNumber, inputKhlqAddress,
    inputOwnerId, canAssignOwner, defaultOwnerId,
    showNotify, clearForm, fetchCustomers,
  ]);

  const confirm = useConfirm();

  const handleDeleteCustomer = useCallback(async () => {
    if (!selectedCustomer) return;
    if (!can('customer.deleteForever')) {
      showNotify('error', 'Chỉ Master Admin mới có quyền xóa vĩnh viễn khách hàng.');
      return;
    }
    const ok = await confirm({
      title: 'Xoá Khách hàng',
      message: `Bạn có chắc chắn muốn xoá Khách hàng "${selectedCustomer.FullName}" (CIF: ${selectedCustomer.CifKh})?`,
      confirmText: 'Xoá vĩnh viễn',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteCustomerAPI(selectedCustomer.Id);
      showNotify('success', 'Đã xoá khách hàng thành công!');
      setIsDrawerOpen(false);
      clearForm();
      fetchCustomers();
    } catch (err: any) {
      showNotify('error', `Lỗi xoá khách hàng: ${err.message}`);
    }
  }, [selectedCustomer, can, showNotify, clearForm, fetchCustomers]);

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
      inputCif, setInputCif: (v: string) => setInputCif(v.replace(/\s+/g, '')),
      inputFullName, setInputFullName: (v: string) => setInputFullName(v.toUpperCase()),
      inputNationalId, setInputNationalId: (v: string) => setInputNationalId(capDigits(v, NATIONAL_ID_CCCD_LENGTH)),
      inputIdCardIssueDate, setInputIdCardIssueDate,
      inputIdCardIssuePlace, setInputIdCardIssuePlace,
      inputPhone, setInputPhone: (v: string) => setInputPhone(capNumberList(v, PHONE_LENGTH)),
      inputEmail, setInputEmail,
      inputAddress, setInputAddress,
      inputAccountNumber, setInputAccountNumber: (v: string) => setInputAccountNumber(normalizeNumberList(v)),
      inputMaritalStatus, setInputMaritalStatus: (v: string) => {
        setInputMaritalStatus(v);
        if (v === 'Đã kết hôn' && inputKhlqRelationship === 'Không có KHLQ') {
          setInputKhlqRelationship('Vợ / Chồng');
        } else if (v === 'Độc thân' && inputKhlqRelationship === 'Vợ / Chồng') {
          setInputKhlqRelationship('Không có KHLQ');
        }
      },
      inputCifKhlq, setInputCifKhlq: (v: string) => setInputCifKhlq(v.replace(/\s+/g, '')),
      inputKhlqRelationship, setInputKhlqRelationship,
      inputSpouseName, setInputSpouseName: (v: string) => setInputSpouseName(v.toUpperCase()),
      inputSpouseNationalId, setInputSpouseNationalId: (v: string) => setInputSpouseNationalId(capDigits(v, NATIONAL_ID_CCCD_LENGTH)),
      inputSpousePhone, setInputSpousePhone: (v: string) => setInputSpousePhone(capNumberList(v, PHONE_LENGTH)),
      inputSpouseAccountNumber, setInputSpouseAccountNumber: (v: string) => setInputSpouseAccountNumber(normalizeNumberList(v)),
      inputKhlqAddress, setInputKhlqAddress,
      inputOwnerId, setInputOwnerId,
      canAssignOwner,
      ownerOptions,
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
    parseAndApplySnippet,
  };
}
