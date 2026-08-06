import type { CreditContract, LoanContract, RateAdjustmentHistoryItem } from '../types';
import { getContractRateHistory, getMasterHdtdNumber, parseMoneyDecimalInput, stripLegacyNoteBlobs, toIsoDate } from './utils';
import { buildRateFields, resolveRateModeOf } from './rateResolution';
import { resolveMasterHdtdNumber } from './creditContract';

export const LOAN_METHODS = [
  'Hạn mức tín dụng',
  'Hạn mức tín dụng từng lần',
  'Cho vay từng lần',
  'Hạn mức thẻ tín dụng',
  'Cầm cố sổ tiết kiệm',
];

export type RateMode = 'pref' | 'base';

export interface KunnFormFields {
  hdtdNumber: string;
  kunnNumber: string;
  contract: Partial<LoanContract>;
  creditLimit: string;
  creditLimitCode: string;
  creditLimitAmount: string;
  loanAmount: string;
  currentBalance: string;
  ratePreferential: string;
  ratePreferentialMonths: string;
  rateBase: string;
  rateMargin: string;
  rateFloor: string;
  rateMode: RateMode;
  conditionSurcharge: string;
  rateHistory: RateAdjustmentHistoryItem[];
  collateralIds: number[];
}

export function rateToInput(v?: number | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return Number((v * 100).toFixed(4)).toString();
}

export function intToInput(v?: number | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '';
  return String(v);
}

function money(v?: number | null): string {
  return v ? v.toLocaleString('vi-VN') : '';
}

export function contractToFormFields(c: LoanContract, creditContracts: CreditContract[]): KunnFormFields {
  const collateralIds = c.CollateralIds
    ? c.CollateralIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !Number.isNaN(id))
    : c.CollateralId ? [c.CollateralId] : [];

  return {
    hdtdNumber: resolveMasterHdtdNumber(c, creditContracts),
    kunnNumber: c.ContractNumber || '',
    contract: {
      Id: c.Id,
      CustomerId: c.CustomerId,
      CreditContractId: c.CreditContractId
        ?? creditContracts.find(cc => cc.HdtdNumber === getMasterHdtdNumber(c))?.Id
        ?? null,
      ContractNumber: c.ContractNumber,
      HdtdDueDate: toIsoDate(c.HdtdDueDate),
      ContractType: c.ContractType,
      LoanMethod: c.LoanMethod || LOAN_METHODS[0],
      DebtGroup: c.DebtGroup ?? 1,
      ContractStartDate: c.ContractStartDate ?? '',
      ContractEndDate: c.ContractEndDate ?? '',
      LoanTenorMonths: c.LoanTenorMonths ?? undefined,
      DisbursementDate: c.DisbursementDate ?? '',
      KunnDueDate: c.KunnDueDate ?? '',
      KunnTenor: c.KunnTenor ?? '',
      RepaymentStartDate: c.RepaymentStartDate ?? '',
      LoanPurposeType: c.LoanPurposeType ?? '',
      LoanPurpose: c.LoanPurpose ?? '',
      PrincipalRepaymentMethod: c.PrincipalRepaymentMethod || 'Trả đều hàng tháng',
      InterestRepaymentMethod: c.InterestRepaymentMethod || 'Trả hàng tháng theo dư nợ giảm dần',
      PrincipalGracePeriodMonths: c.PrincipalGracePeriodMonths ?? 0,
      InterestGracePeriodMonths: c.InterestGracePeriodMonths ?? 0,
      IsSettled: c.IsSettled ?? false,
      IsRestructured: c.IsRestructured ?? false,
    },
    creditLimit: money(c.ContractAmount),
    creditLimitCode: c.CreditLimitCode || '',
    creditLimitAmount: money(c.CreditLimitAmount),
    loanAmount: money(c.LoanAmount),
    currentBalance: money(c.CurrentBalance),
    ratePreferential: rateToInput(c.PreferentialRate),
    ratePreferentialMonths: intToInput(c.PreferentialPeriodMonths),
    rateBase: rateToInput(c.BaseRate),
    rateMargin: rateToInput(c.MarginRate),
    rateFloor: rateToInput(c.RateFloorAnnual),
    rateMode: resolveRateModeOf(c),
    conditionSurcharge: (c.PenaltySurcharge != null && c.PenaltySurcharge > 0) ? c.PenaltySurcharge.toString() : '0',
    rateHistory: getContractRateHistory(c),
    collateralIds,
  };
}

export function blankFormFields(customerId?: number): KunnFormFields {
  return {
    hdtdNumber: '',
    kunnNumber: '',
    contract: {
      CustomerId: customerId,
      ContractType: 0,
      DebtGroup: 1,
      PrincipalRepaymentMethod: 'Gốc trả cuối kỳ',
      InterestRepaymentMethod: 'Trả hàng tháng theo dư nợ thực tế',
      PrincipalGracePeriodMonths: 0,
      InterestGracePeriodMonths: 0,
      IsSettled: false,
      IsRestructured: false,
    },
    creditLimit: '',
    creditLimitCode: '',
    creditLimitAmount: '',
    loanAmount: '',
    currentBalance: '',
    ratePreferential: '',
    ratePreferentialMonths: '',
    rateBase: '',
    rateMargin: '',
    rateFloor: '',
    rateMode: 'pref',
    conditionSurcharge: '0',
    rateHistory: [],
    collateralIds: [],
  };
}

export function nextKunnNumberFor(hdtdNumber: string, contracts: LoanContract[]): string {
  const hdtd = hdtdNumber.trim();
  if (!hdtd) return 'HĐTD-01/GNN-01';
  const existingCount = contracts.filter(
    c => getMasterHdtdNumber(c).toLowerCase() === hdtd.toLowerCase()
  ).length;
  return `${hdtd}/GNN-${(existingCount + 1).toString().padStart(2, '0')}`;
}

function cleanDate(d?: string | null): string | null {
  return (d && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) ? d.trim() : null;
}

export interface KunnPayloadInput {
  fields: KunnFormFields;
  customerId: number;
  contractNumber: string;
  prefPercent: number;
  basePercent: number;
  marginPercent: number;
  activeRatePercent: number;
}

export function buildKunnPayload({
  fields, customerId, contractNumber,
  prefPercent, basePercent, marginPercent, activeRatePercent,
}: KunnPayloadInput): Partial<LoanContract> {
  const creditLimit = parseMoneyDecimalInput(fields.creditLimit);
  const loanAmount = parseMoneyDecimalInput(fields.loanAmount);
  const currentBalance = parseMoneyDecimalInput(fields.currentBalance) || loanAmount;

  const prefDec = prefPercent ? prefPercent / 100 : undefined;
  const baseDec = basePercent ? basePercent / 100 : undefined;
  const normalDec = (basePercent + marginPercent) ? (basePercent + marginPercent) / 100 : undefined;

  const interestRate = activeRatePercent > 0
    ? activeRatePercent / 100
    : ((fields.rateMode === 'pref' ? prefDec : normalDec) || prefDec || normalDec || baseDec || undefined);

  const noteText = stripLegacyNoteBlobs(fields.contract.Note || '');

  return {
    ...fields.contract,
    CustomerId: customerId,
    ContractNumber: contractNumber,

    ContractStartDate: cleanDate(fields.contract.ContractStartDate),
    ContractEndDate: cleanDate(fields.contract.ContractEndDate),
    DisbursementDate: cleanDate(fields.contract.DisbursementDate),
    KunnDueDate: cleanDate(fields.contract.KunnDueDate),
    RepaymentStartDate: cleanDate(fields.contract.RepaymentStartDate),
    HdtdDueDate: cleanDate(fields.contract.HdtdDueDate),

    Note: noteText || null,
    RateHistory: fields.rateHistory.length > 0 ? fields.rateHistory : null,
    CollateralIds: fields.collateralIds.length > 0 ? fields.collateralIds.join(',') : null,
    PenaltySurcharge: parseFloat(fields.conditionSurcharge) || 0,

    ContractAmount: creditLimit,
    LoanAmount: loanAmount,
    CurrentBalance: currentBalance,

    CreditLimitCode: fields.creditLimitCode.trim() || null,
    CreditLimitAmount: fields.creditLimitCode.trim()
      ? (parseMoneyDecimalInput(fields.creditLimitAmount) || null)
      : null,

    ...buildRateFields(fields.rateMode, {
      prefPercent,
      prefMonths: parseInt(fields.ratePreferentialMonths, 10) || 0,
      basePercent,
      marginPercent,
      floorPercent: fields.rateFloor.trim() === '' ? null : parseFloat(fields.rateFloor) || 0,
    }),
    InterestRate: interestRate,

    CollateralId: fields.collateralIds.length > 0 ? fields.collateralIds[0] : null,
  };
}
