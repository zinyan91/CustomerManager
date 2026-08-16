import { useState, useCallback } from 'react';
import { Customer, LoanContract, CreditContract, Collateral, CardContract } from '../types';
import { customerApi } from '../api/customerApi';

export function useCustomerModal() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerLoans, setCustomerLoans] = useState<LoanContract[]>([]);
  const [customerCredits, setCustomerCredits] = useState<CreditContract[]>([]);
  const [customerCollaterals, setCustomerCollaterals] = useState<Collateral[]>([]);
  const [customerCards, setCustomerCards] = useState<CardContract[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const openCustomer = useCallback(async (cust: Customer) => {
    setSelectedCustomer(cust);
    setLoadingDetails(true);
    try {
      const details = await customerApi.fetchCustomerDetails(cust.Id);
      setCustomerLoans(details.loans);
      setCustomerCredits(details.credits);
      setCustomerCollaterals(details.collaterals);
      setCustomerCards(details.cards);
    } catch (err) {
      console.error('Lỗi chi tiết khách hàng:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const closeCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerLoans([]);
    setCustomerCredits([]);
    setCustomerCollaterals([]);
    setCustomerCards([]);
  }, []);

  return {
    selectedCustomer,
    customerLoans,
    customerCredits,
    customerCollaterals,
    customerCards,
    loadingDetails,
    openCustomer,
    closeCustomer,
  };
}
