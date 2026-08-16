import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Customer,
  CreditContract,
  LoanContract,
  Collateral,
  CardContract,
  PostLoanControlRecord,
} from '../types';
import { portfolioApi } from '../api/portfolioApi';
import { computeDueDashboard } from '../utils/dueCalculation';

export function usePortfolioData(isLoggedIn: boolean) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creditContracts, setCreditContracts] = useState<CreditContract[]>([]);
  const [loanContracts, setLoanContracts] = useState<LoanContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [cardContracts, setCardContracts] = useState<CardContract[]>([]);
  const [postLoanRecords, setPostLoanRecords] = useState<PostLoanControlRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await portfolioApi.fetchAllPortfolio();
      setCustomers(data.customers);
      setCreditContracts(data.creditContracts);
      setLoanContracts(data.loanContracts);
      setCollaterals(data.collaterals);
      setCardContracts(data.cardContracts);
      setPostLoanRecords(data.postLoanRecords);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      setLoading(true);
      loadData();
    }
  }, [isLoggedIn, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Metrics (Đồng bộ 100% công thức Web Dashboard)
  const totalOutstandingBalance = useMemo(() => {
    const duNoCua = (c: LoanContract) =>
      c.IsSettled ? 0 : (c.CurrentBalance ?? c.LoanAmount ?? c.ContractAmount ?? 0);
    return loanContracts.reduce((sum, item) => sum + duNoCua(item), 0);
  }, [loanContracts]);

  const totalCreditLimit = useMemo(() => {
    return loanContracts.reduce((sum, item) => sum + (item.ContractAmount || 0), 0);
  }, [loanContracts]);

  const totalCollateralValue = useMemo(() => {
    return collaterals.reduce((sum, item) => sum + (item.AppraisedValue || item.Value || 0), 0);
  }, [collaterals]);

  // Customer Map
  const customerMap = useMemo(() => {
    const map = new Map<string | number, Customer>();
    customers.forEach((c) => {
      map.set(c.Id, c);
      map.set(String(c.Id), c);
      map.set(Number(c.Id), c);
    });
    return map;
  }, [customers]);

  // Due Engine (Web matching)
  const dueData = useMemo(() => {
    return computeDueDashboard(loanContracts, collaterals, customerMap);
  }, [loanContracts, collaterals, customerMap]);

  // Filtered Lists for Search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.FullName?.toLowerCase().includes(q) ||
        c.CifKh?.toLowerCase().includes(q) ||
        c.Phone?.includes(q) ||
        c.NationalId?.includes(q)
    );
  }, [customers, searchQuery]);

  const filteredLoans = useMemo(() => {
    if (!searchQuery.trim()) return loanContracts;
    const q = searchQuery.toLowerCase().trim();
    return loanContracts.filter(
      (l) =>
        l.ContractNumber?.toLowerCase().includes(q) ||
        l.customer?.FullName?.toLowerCase().includes(q) ||
        l.customer?.CifKh?.toLowerCase().includes(q)
    );
  }, [loanContracts, searchQuery]);

  const filteredCredits = useMemo(() => {
    if (!searchQuery.trim()) return creditContracts;
    const q = searchQuery.toLowerCase().trim();
    return creditContracts.filter(
      (c) =>
        c.HdtdNumber?.toLowerCase().includes(q) ||
        c.customer?.FullName?.toLowerCase().includes(q) ||
        c.customer?.CifKh?.toLowerCase().includes(q)
    );
  }, [creditContracts, searchQuery]);

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cardContracts;
    const q = searchQuery.toLowerCase().trim();
    return cardContracts.filter(
      (c) =>
        c.CardContractNumber?.toLowerCase().includes(q) ||
        c.CardHolderName?.toLowerCase().includes(q) ||
        c.customer?.FullName?.toLowerCase().includes(q) ||
        c.customer?.CifKh?.toLowerCase().includes(q)
    );
  }, [cardContracts, searchQuery]);

  const filteredCollaterals = useMemo(() => {
    if (!searchQuery.trim()) return collaterals;
    const q = searchQuery.toLowerCase().trim();
    return collaterals.filter(
      (c) =>
        c.AssetCode?.toLowerCase().includes(q) ||
        c.Address?.toLowerCase().includes(q) ||
        c.customer?.FullName?.toLowerCase().includes(q) ||
        c.customer?.CifKh?.toLowerCase().includes(q)
    );
  }, [collaterals, searchQuery]);

  const filteredPostLoans = useMemo(() => {
    if (!searchQuery.trim()) return postLoanRecords;
    const q = searchQuery.toLowerCase().trim();
    return postLoanRecords.filter(
      (p) =>
        p.ControlKey?.toLowerCase().includes(q) ||
        p.Findings?.toLowerCase().includes(q) ||
        p.customer?.FullName?.toLowerCase().includes(q) ||
        p.customer?.CifKh?.toLowerCase().includes(q)
    );
  }, [postLoanRecords, searchQuery]);

  return {
    customers,
    creditContracts,
    loanContracts,
    collaterals,
    cardContracts,
    postLoanRecords,
    loading,
    refreshing,
    onRefresh,
    searchQuery,
    setSearchQuery,
    totalOutstandingBalance,
    totalCreditLimit,
    totalCollateralValue,
    dueData,
    filteredCustomers,
    filteredLoans,
    filteredCredits,
    filteredCards,
    filteredCollaterals,
    filteredPostLoans,
  };
}
