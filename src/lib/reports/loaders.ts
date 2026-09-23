import { fetchCustomersStrictAPI } from '../api/customerApi';
import {
  fetchContractsStrictAPI,
  fetchOutstandingScheduleDetailsAPI,
  fetchPaidPrincipalMapAPI,
} from '../api/loanContractApi';
import { fetchAllCreditContractsAPI } from '../api/creditContractApi';
import { fetchCollateralsStrictAPI } from '../api/collateralApi';
import { addDaysToDate } from '../loanMath';
import { REPORT_UPCOMING_DAYS } from './dueBucket';
import { mapCollateralRows, mapCreditRows, mapDueRows, mapKunnRows } from './mappers';
import type { ReportLoadContext, ReportRowSet } from './types';

function reportCutoffIso(todayIso: string): string {
  return addDaysToDate(todayIso, REPORT_UPCOMING_DAYS);
}

async function loadLoanBasics() {
  const [customers, contracts, paid] = await Promise.all([
    fetchCustomersStrictAPI(),
    fetchContractsStrictAPI(),
    fetchPaidPrincipalMapAPI(),
  ]);
  return { customers, contracts, paid };
}

export async function loadPortfolioParams(): Promise<ReportRowSet> {
  const [basics, creditContracts, collaterals] = await Promise.all([
    loadLoanBasics(),
    fetchAllCreditContractsAPI(),
    fetchCollateralsStrictAPI(),
  ]);
  return {
    rows: [{
      customers: basics.customers,
      contracts: basics.contracts,
      creditContracts,
      collaterals,
      paidPrincipalMap: basics.paid,
    }],
  };
}

export async function loadDueRows(ctx: ReportLoadContext): Promise<ReportRowSet> {
  const { customers, contracts, paid } = await loadLoanBasics();
  const dangVay = contracts.filter(k => k.IsSettled !== true);
  const schedules = await fetchOutstandingScheduleDetailsAPI(
    dangVay.map(k => k.Id),
    reportCutoffIso(ctx.todayIso)
  );
  return { rows: mapDueRows(customers, dangVay, schedules, paid) };
}

export async function loadKunnRows(ctx: ReportLoadContext): Promise<ReportRowSet> {
  const [{ customers, contracts, paid }, creditContracts] = await Promise.all([
    loadLoanBasics(),
    fetchAllCreditContractsAPI(),
  ]);
  const dangVay = contracts.filter(k => k.IsSettled !== true);
  const schedules = await fetchOutstandingScheduleDetailsAPI(
    dangVay.map(k => k.Id),
    ctx.todayIso
  );
  return { rows: mapKunnRows(customers, dangVay, schedules, paid, creditContracts, ctx.todayIso) };
}

export async function loadCreditRows(ctx: ReportLoadContext): Promise<ReportRowSet> {
  const [{ customers, contracts, paid }, creditContracts] = await Promise.all([
    loadLoanBasics(),
    fetchAllCreditContractsAPI(),
  ]);
  return { rows: mapCreditRows(customers, creditContracts, contracts, paid, ctx.todayIso) };
}

export async function loadCollateralRows(): Promise<ReportRowSet> {
  const [customers, collaterals] = await Promise.all([
    fetchCustomersStrictAPI(),
    fetchCollateralsStrictAPI(),
  ]);
  return { rows: mapCollateralRows(customers, collaterals) };
}
