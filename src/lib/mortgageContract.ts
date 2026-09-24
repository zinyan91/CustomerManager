import type { Collateral, CreditContract, MortgageContract } from '../types';
import { normalizeVi } from './mdsdv';
import { toIsoDate } from './utils';

export type MortgageStatusFilter = 'active' | 'released' | 'all';

export type MortgageContractDraft = Omit<MortgageContract, 'Id' | 'CreatedAt'> & { Id?: number };

export function emptyMortgageDraft(customerId: number): MortgageContractDraft {
  return {
    CustomerId: customerId,
    MortgageNumber: '',
    SignedDate: null,
    Pledgor: null,
    MaxSecuredAmount: null,
    NotaryNumber: null,
    NotaryDate: null,
    NotaryOffice: null,
    RegistrationDate: null,
    RegistrationOffice: null,
    IsReleased: false,
    ReleasedDate: null,
    Note: null,
    CollateralIds: [],
    CreditContractIds: [],
  };
}

export function validateMortgageContract(draft: MortgageContractDraft, existing: MortgageContract[]): string[] {
  const errors: string[] = [];
  const number = draft.MortgageNumber.trim();

  if (!number) {
    errors.push('Số HĐTC là bắt buộc.');
  } else {
    const key = number.toLowerCase();
    const duplicate = existing.some(m =>
      m.CustomerId === draft.CustomerId && m.Id !== draft.Id && m.MortgageNumber.trim().toLowerCase() === key);
    if (duplicate) errors.push(`Số HĐTC "${number}" đã có ở khách hàng này.`);
  }

  if (draft.MaxSecuredAmount !== null && draft.MaxSecuredAmount !== undefined && draft.MaxSecuredAmount < 0) {
    errors.push('Giá trị bảo đảm tối đa không được âm.');
  }

  if (draft.IsReleased) {
    const released = toIsoDate(draft.ReleasedDate);
    const signed = toIsoDate(draft.SignedDate);
    if (!released) errors.push('Đã giải chấp thì phải có ngày giải chấp.');
    else if (signed && released < signed) errors.push('Ngày giải chấp không được trước ngày ký.');
  }

  return errors;
}

export function filterMortgageContracts(
  list: MortgageContract[],
  { status, query }: { status: MortgageStatusFilter; query: string }
): MortgageContract[] {
  const q = normalizeVi(query);
  return list.filter(m => {
    if (status === 'active' && m.IsReleased) return false;
    if (status === 'released' && !m.IsReleased) return false;
    if (!q) return true;
    return normalizeVi(m.MortgageNumber).includes(q) || normalizeVi(m.Pledgor).includes(q);
  });
}

export function collateralLabels(ids: number[], collaterals: Collateral[]): string[] {
  const byId = new Map(collaterals.map(c => [c.Id, c]));
  return ids.flatMap(id => {
    const c = byId.get(id);
    return c ? [c.AssetCode || c.AssetType || `TS #${c.Id}`] : [];
  });
}

export function creditContractLabels(ids: number[], creditContracts: CreditContract[]): string[] {
  const byId = new Map(creditContracts.map(c => [c.Id, c]));
  return ids.flatMap(id => {
    const c = byId.get(id);
    return c ? [c.HdtdNumber] : [];
  });
}

export function mortgagesOfCollateral(collateralId: number, list: MortgageContract[]): MortgageContract[] {
  return list.filter(m => m.CollateralIds.includes(collateralId));
}

export function mortgagesOfCreditContract(creditContractId: number, list: MortgageContract[]): MortgageContract[] {
  return list.filter(m => m.CreditContractIds.includes(creditContractId));
}

export function linkDiff(before: number[], after: number[]): { add: number[]; remove: number[] } {
  const was = new Set(before);
  const now = new Set(after);
  return {
    add: [...now].filter(id => !was.has(id)),
    remove: [...was].filter(id => !now.has(id)),
  };
}

export function paginate<T>(list: T[], page: number, pageSize: number): { rows: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return { rows: list.slice((current - 1) * pageSize, current * pageSize), page: current, totalPages };
}

const LINK_CONSTRAINT = {
  collateral: 'fk_mortgage_link_collateral',
  credit_contract: 'fk_mortgage_link_credit_contract',
} as const;

export function mortgageLinkErrorMessage(
  error: { code?: string; message?: string } | null | undefined,
  target: 'collateral' | 'credit_contract'
): string | null {
  if (!error || error.code !== '23503' || !error.message?.includes(LINK_CONSTRAINT[target])) return null;
  return target === 'collateral'
    ? 'Không thể xoá: tài sản đang nằm trong hợp đồng thế chấp. Gỡ tài sản khỏi HĐTC trước.'
    : 'Không xoá được HĐTD: hợp đồng đang được bảo đảm bởi hợp đồng thế chấp. Gỡ HĐTD khỏi HĐTC trước.';
}
