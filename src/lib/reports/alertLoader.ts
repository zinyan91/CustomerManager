import { fetchCustomersStrictAPI } from '../api/customerApi';
import { fetchCollateralsStrictAPI } from '../api/collateralApi';
import { fetchAllCreditContractsAPI } from '../api/creditContractApi';
import { fetchContractsStrictAPI, fetchOutstandingSchedulesAPI, fetchPaidPrincipalMapAPI } from '../api/loanContractApi';
import { dueCutoffIso } from '../duePeriod';
import type { AlertSnapshot } from './alertData';

export async function loadAlertSnapshot(today: string): Promise<AlertSnapshot> {
  const [customers, contracts, collaterals, creditContracts, paidPrincipalMap] = await Promise.all([
    fetchCustomersStrictAPI(), fetchContractsStrictAPI(), fetchCollateralsStrictAPI(),
    fetchAllCreditContractsAPI(), fetchPaidPrincipalMapAPI(),
  ]);
  const periods = await fetchOutstandingSchedulesAPI(
    contracts.filter(c => !c.IsSettled).map(c => c.Id), dueCutoffIso(today),
  );
  return { customers, contracts, collaterals, creditContracts, paidPrincipalMap, periods, today };
}
