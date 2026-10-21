import { useCallback, useEffect, useRef, useState } from 'react';
import type { Collateral, CardContract, CreditContract, Customer, LoanContract, RepaymentSchedule } from '../types';
import {
  fetchCollateralsByCustomerAPI, fetchContractsByCustomerAPI, fetchCreditContractsByCustomerAPI,
  fetchCardContractsByCustomerAPI,
  fetchCustomersAPI, fetchRepaymentSchedulesAPI,
} from '../lib/api';
import { recalculateSchedules } from '../lib/loanMath';

interface UseCustomerPortfolioParams {
  selectedCustomerId: number | null;
  setSelectedCustomerId: (id: number) => void;
  onNotify: (type: 'success' | 'error', message: string) => void;
  onCustomerChanged: () => void;
  onContractOpened: (contract: LoanContract) => void;
  onContractClosed: () => void;
}

export function useCustomerPortfolio({
  selectedCustomerId, setSelectedCustomerId,
  onNotify, onCustomerChanged, onContractOpened, onContractClosed,
}: UseCustomerPortfolioParams) {
  const [searchCif, setSearchCif] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchContract, setSearchContract] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [dropdownQuery, setDropdownQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [creditContracts, setCreditContracts] = useState<CreditContract[]>([]);
  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [cards, setCards] = useState<CardContract[]>([]);
  const [selectedContract, setSelectedContract] = useState<LoanContract | null>(null);
  const [schedules, setSchedules] = useState<RepaymentSchedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [allSchedulesMap, setAllSchedulesMap] = useState<Record<number, RepaymentSchedule[]>>({});
  const contractTokenRef = useRef(0);
  const cancelContractLoad = useCallback(() => { contractTokenRef.current++; }, []);

  useEffect(() => {
    fetchCustomersAPI().then(list => {
      list.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      setAllCustomers(list);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    let canceled = false;
    setSchedules([]);
    contractTokenRef.current++;
    setScheduleError(null);
    setScheduleLoading(false);
    setCreditContracts([]);
    setAllSchedulesMap({});
    setSelectedContract(null);
    onCustomerChanged();

    const id = foundCustomer?.Id;
    if (!id) {
      setCreditContracts([]);
      return;
    }
    if (selectedCustomerId !== id) setSelectedCustomerId(id);
    fetchCreditContractsByCustomerAPI(id).then(rows => {
      if (!canceled) setCreditContracts(rows);
    }).catch(error => {
      if (!canceled) onNotify('error', error instanceof Error ? error.message : String(error));
    });
    return () => {
      canceled = true;
      cancelContractLoad();
    };
  }, [foundCustomer?.Id, cancelContractLoad]);

  const pickTokenRef = useRef(0);

  const loadAllSchedulesForContracts = async (cons: LoanContract[], token: number) => {
    const map: Record<number, RepaymentSchedule[]> = {};
    await Promise.all(cons.map(async (c) => {
      try {
        map[c.Id] = await fetchRepaymentSchedulesAPI(c.Id);
      } catch { }
    }));
    if (pickTokenRef.current !== token) return;
    setAllSchedulesMap(map);
  };

  const pickCustomer = async (c: Customer) => {
    const token = ++pickTokenRef.current;
    setShowDropdown(false);
    setDropdownQuery(c.FullName);
    setSearchCif(c.CifKh);
    setSearchName('');
    setSearchContract('');
    setFoundCustomer(c);
    setContracts([]);
    setSelectedContract(null);

    const [cons, cols, crds] = await Promise.all([
      fetchContractsByCustomerAPI(c.Id),
      fetchCollateralsByCustomerAPI(c.Id),
      fetchCardContractsByCustomerAPI(c.Id),
    ]);
    if (pickTokenRef.current !== token) return;
    setContracts(cons);
    setCollaterals(cols);
    setCards(crds);
    loadAllSchedulesForContracts(cons, token);
  };

  useEffect(() => {
    if (allCustomers.length === 0 || !selectedCustomerId) return;
    if (foundCustomer?.Id === selectedCustomerId) return;
    const c = allCustomers.find(x => x.Id === selectedCustomerId);
    if (c) {
      pickCustomer(c);
    } else {
      pickTokenRef.current++;
      setFoundCustomer(null);
      setContracts([]);
      setCollaterals([]);
      setCards([]);
      onNotify('error', 'Không tìm thấy khách hàng hoặc bạn không có quyền truy cập.');
    }
  }, [selectedCustomerId, allCustomers]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCif.trim() && !searchName.trim() && !searchContract.trim()) {
      onNotify('error', 'Nhập ít nhất một thông tin để tìm kiếm.');
      return;
    }
    const token = ++pickTokenRef.current;
    setIsSearching(true);
    setFoundCustomer(null);
    setContracts([]);
    setCollaterals([]);
    setCards([]);
    setSelectedContract(null);

    try {
      let customers: Customer[] = [];
      if (searchCif.trim()) {
        customers = await fetchCustomersAPI({ cif: searchCif.trim() });
      } else if (searchName.trim()) {
        customers = await fetchCustomersAPI({ name: searchName.trim() });
      }

      let matchedCustomer: Customer | null = customers.length > 0 ? customers[0] : null;

      if (!matchedCustomer && searchContract.trim()) {
        const allCust = await fetchCustomersAPI({});
        for (const c of allCust) {
          if (pickTokenRef.current !== token) return;
          const [cons, credits] = await Promise.all([
            fetchContractsByCustomerAPI(c.Id), fetchCreditContractsByCustomerAPI(c.Id),
          ]);
          if (pickTokenRef.current !== token) return;
          const query = searchContract.trim().toLocaleLowerCase('vi-VN');
          const found = cons.some(con => con.ContractNumber?.toLocaleLowerCase('vi-VN').includes(query))
            || credits.some(con => con.HdtdNumber?.toLocaleLowerCase('vi-VN').includes(query));
          if (found) { matchedCustomer = c; setContracts(cons); break; }
        }
      }

      if (pickTokenRef.current !== token) return;

      if (!matchedCustomer) {
        onNotify('error', 'Không tìm thấy khách hàng phù hợp.');
      } else {
        setFoundCustomer(matchedCustomer);
        setDropdownQuery(matchedCustomer.FullName);
        setSearchCif(matchedCustomer.CifKh);
        setSearchName('');
        const [cons, cols, crds] = await Promise.all([
          fetchContractsByCustomerAPI(matchedCustomer.Id),
          fetchCollateralsByCustomerAPI(matchedCustomer.Id),
          fetchCardContractsByCustomerAPI(matchedCustomer.Id),
        ]);
        if (pickTokenRef.current !== token) return;
        setContracts(cons);
        setCollaterals(cols);
        setCards(crds);
        loadAllSchedulesForContracts(cons, token);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      onNotify('error', `Không tìm được: ${message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    pickTokenRef.current++;
    setFoundCustomer(null);
    setContracts([]);
    setCollaterals([]);
    setCards([]);
    setSelectedContract(null);
    setSearchCif('');
    setSearchName('');
    setSearchContract('');
    setDropdownQuery('');
  };

  const openContract = async (c: LoanContract) => {
    const token = ++contractTokenRef.current;
    setSelectedContract(c);
    setSchedules([]);
    setScheduleLoading(true);
    setScheduleError(null);
    onContractOpened(c);

    try {
      const loaded = await fetchRepaymentSchedulesAPI(c.Id);
      if (token !== contractTokenRef.current) return;
      const next = loaded.length > 0 ? recalculateSchedules(loaded, c) : loaded;
      setSchedules(next);
      setAllSchedulesMap(prev => ({ ...prev, [c.Id]: next }));
    } catch (error) {
      if (token === contractTokenRef.current) setScheduleError(error instanceof Error ? error.message : String(error));
    } finally {
      if (token === contractTokenRef.current) setScheduleLoading(false);
    }
  };

  const selectContract = async (c: LoanContract) => {
    if (selectedContract?.Id === c.Id) {
      contractTokenRef.current++;
      setSelectedContract(null);
      setSchedules([]);
      onContractClosed();
      return;
    }
    await openContract(c);
  };

  return {
    searchCif, setSearchCif,
    searchName, setSearchName,
    searchContract, setSearchContract,
    isSearching,
    allCustomers,
    dropdownQuery, setDropdownQuery,
    showDropdown, setShowDropdown,
    foundCustomer, setFoundCustomer,
    creditContracts, setCreditContracts,
    contracts, setContracts,
    collaterals,
    cards,
    selectedContract, setSelectedContract,
    schedules, setSchedules,
    scheduleLoading, scheduleError,
    allSchedulesMap, setAllSchedulesMap,
    loadAllSchedulesForContracts,
    pickCustomer,
    search,
    selectContract,
    openContract,
    cancelContractLoad,
    clearSearch,
  };
}
