import { useEffect, useRef, useState } from 'react';
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
  const [allSchedulesMap, setAllSchedulesMap] = useState<Record<number, RepaymentSchedule[]>>({});

  useEffect(() => {
    fetchCustomersAPI().then(list => {
      list.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      setAllCustomers(list);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    setSchedules([]);
    setAllSchedulesMap({});
    setSelectedContract(null);
    onCustomerChanged();

    const id = foundCustomer?.Id;
    if (!id) {
      setCreditContracts([]);
      return;
    }
    if (selectedCustomerId !== id) setSelectedCustomerId(id);
    fetchCreditContractsByCustomerAPI(id).then(setCreditContracts);
  }, [foundCustomer?.Id]);

  const pickTokenRef = useRef(0);

  const loadAllSchedulesForContracts = async (cons: LoanContract[]) => {
    const map: Record<number, RepaymentSchedule[]> = {};
    await Promise.all(cons.map(async (c) => {
      try {
        map[c.Id] = await fetchRepaymentSchedulesAPI(c.Id);
      } catch { }
    }));
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
    loadAllSchedulesForContracts(cons);
  };

  useEffect(() => {
    if (allCustomers.length === 0 || !selectedCustomerId) return;
    if (foundCustomer?.Id === selectedCustomerId) return;
    const c = allCustomers.find(x => x.Id === selectedCustomerId);
    if (c) {
      pickCustomer(c);
    } else {
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
          const cons = await fetchContractsByCustomerAPI(c.Id);
          const found = cons.find(con => con.ContractNumber?.toLowerCase().includes(searchContract.toLowerCase()));
          if (found) { matchedCustomer = c; setContracts(cons); break; }
        }
      }

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
        setContracts(cons);
        setCollaterals(cols);
        setCards(crds);
        loadAllSchedulesForContracts(cons);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      onNotify('error', `Không tìm được: ${message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
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
    setSelectedContract(c);
    onContractOpened(c);

    const loaded = await fetchRepaymentSchedulesAPI(c.Id);
    const next = loaded.length > 0 ? recalculateSchedules(loaded, c) : loaded;
    setSchedules(next);
    setAllSchedulesMap(prev => ({ ...prev, [c.Id]: next }));
  };

  const selectContract = async (c: LoanContract) => {
    if (selectedContract?.Id === c.Id) {
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
    allSchedulesMap, setAllSchedulesMap,
    loadAllSchedulesForContracts,
    pickCustomer,
    search,
    selectContract,
    openContract,
    clearSearch,
  };
}
