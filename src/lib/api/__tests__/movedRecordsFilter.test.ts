import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ calls: [] as Array<{ table: string; op: string; args: unknown[] }> }));

vi.mock('../../supabase', () => ({
  supabase: {
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      for (const op of ['select', 'eq', 'in', 'is', 'order', 'range', 'setHeader', 'single']) {
        builder[op] = (...args: unknown[]) => (h.calls.push({ table, op, args }), builder);
      }
      builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: [], error: null });
      return builder;
    },
  },
}));
vi.mock('../customerApi', () => ({
  fetchCustomerIdsInScopeAPI: async () => null,
  unarchiveCustomer: async () => undefined,
}));

import { fetchContractsByCustomerAPI, fetchContractsStrictAPI } from '../loanContractApi';
import { fetchAllCreditContractsAPI, fetchCreditContractsByCustomerAPI } from '../creditContractApi';
import { fetchCollateralsByCustomerAPI, fetchCollateralsStrictAPI } from '../collateralApi';
import { fetchTeamCustomerDossier } from '../teamCustomerApi';

const ALL = { kind: 'all' } as const;
const filtered = (table: string, column: string) =>
  h.calls.some((c) => c.table === table && c.op === 'is' && c.args[0] === column && c.args[1] === null);

beforeEach(() => {
  h.calls = [];
});

describe('loc ban ghi da chuyen sang tab Huy dong & Cam co', () => {
  it.each([
    ['fetchContractsStrictAPI', () => fetchContractsStrictAPI(ALL), 'LoanContracts', 'MovedToPledgeLoanId'],
    ['fetchContractsByCustomerAPI', () => fetchContractsByCustomerAPI(1), 'LoanContracts', 'MovedToPledgeLoanId'],
    ['fetchAllCreditContractsAPI', () => fetchAllCreditContractsAPI(ALL), 'CreditContracts', 'MovedToPledgeLoanId'],
    ['fetchCreditContractsByCustomerAPI', () => fetchCreditContractsByCustomerAPI(1), 'CreditContracts', 'MovedToPledgeLoanId'],
    ['fetchCollateralsStrictAPI', () => fetchCollateralsStrictAPI(ALL), 'Collaterals', 'MovedToSavingsBookId'],
    ['fetchCollateralsByCustomerAPI', () => fetchCollateralsByCustomerAPI(1), 'Collaterals', 'MovedToSavingsBookId'],
  ])('%s', async (_name, run, table, column) => {
    await run();
    expect(filtered(table, column)).toBe(true);
  });

  it('ho so khach cua nhom', async () => {
    h.calls = [];
    await fetchTeamCustomerDossier(1).catch(() => undefined);
    expect(filtered('LoanContracts', 'MovedToPledgeLoanId')).toBe(true);
    expect(filtered('Collaterals', 'MovedToSavingsBookId')).toBe(true);
  });
});
