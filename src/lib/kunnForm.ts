import type { CreditContract, LoanContract, RateAdjustmentHistoryItem } from '../types';
import { getContractRateHistory, getMasterHdtdNumber, parseMoneyDecimalInput, formatMoneyInput, formatMoneyWith, stripLegacyNoteBlobs } from './utils';
import { buildRateFields, resolveRateModeOf } from './rateResolution';
import { resolveMasterHdtdNumber, hdtdEffectiveDatesOf } from './creditContract';
import { isBulletPrincipal, roundPrincipalCore } from './loanMath';

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
  monthlyPrincipal: string;
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
  return v ? formatMoneyInput(String(v)) : '';
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
    monthlyPrincipal: money(c.MonthlyPrincipalAmount),
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
    monthlyPrincipal: '',
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

export const MONTHLY_PRINCIPAL_TOLERANCE = 100_000;

export interface MonthlyPrincipalCheckInput {
  declared: number | null;
  loanAmount: number;
  totalPeriods: number;
  graceMonths: number;
  isBullet: boolean;
}

export interface MonthlyPrincipalCheck {
  ok: boolean;
  message?: string;
  quotient: number;
  suggested: number;
}

export function checkMonthlyPrincipal(input: MonthlyPrincipalCheckInput): MonthlyPrincipalCheck {
  const repayPeriods = Math.max(1, input.totalPeriods - input.graceMonths);
  const quotient = input.loanAmount > 0 ? input.loanAmount / repayPeriods : 0;
  const suggested = quotient > 0 ? roundPrincipalCore(quotient) : 0;
  const base = { quotient, suggested };

  if (input.isBullet) return { ok: true, ...base };
  if (input.declared === null || input.declared === 0) return { ok: true, ...base };

  if (input.declared < 0) {
    return { ok: false, message: 'Gốc mỗi kỳ không thể là số âm.', ...base };
  }

  if (quotient <= 0 || input.totalPeriods <= 0) return { ok: true, ...base };

  const step = MONTHLY_PRINCIPAL_TOLERANCE;
  const min = Math.floor(quotient / step) * step;
  const max = Math.ceil(quotient / step) * step;

  if (input.declared < min || input.declared > max) {
    return {
      ok: false,
      message:
        `Gốc mỗi kỳ ${formatMoneyWith(input.declared)}đ không khớp với số tiền vay ` +
        `${formatMoneyWith(input.loanAmount)}đ chia ${repayPeriods} kỳ trả gốc ` +
        `(${formatMoneyWith(Math.round(quotient))}đ/kỳ). ` +
        `Ba con số này phải nhất quán — kiểm lại GNN xem sai ở số tiền vay, kỳ hạn hay gốc mỗi kỳ. ` +
        `Hệ thống tự tính ra ${formatMoneyWith(suggested)}đ.`,
      ...base,
    };
  }

  return { ok: true, ...base };
}

export interface KunnPayloadInput {
  fields: KunnFormFields;
  customerId: number;
  contractNumber: string;
  prefPercent: number;
  basePercent: number;
  marginPercent: number;
  activeRatePercent: number;
  creditContracts?: Pick<CreditContract, 'Id' | 'ContractStartDate' | 'ContractEndDate'>[];
}

export function buildKunnPayload({
  fields, customerId, contractNumber,
  prefPercent, basePercent, marginPercent, activeRatePercent,
  creditContracts,
}: KunnPayloadInput): Partial<LoanContract> {
  const hanHdtd = hdtdEffectiveDatesOf(
    { CreditContractId: fields.contract.CreditContractId ?? null },
    creditContracts || []
  );
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

    ContractStartDate: hanHdtd?.startDate ?? cleanDate(fields.contract.ContractStartDate),
    ContractEndDate: hanHdtd?.endDate ?? cleanDate(fields.contract.ContractEndDate),
    DisbursementDate: cleanDate(fields.contract.DisbursementDate),
    KunnDueDate: cleanDate(fields.contract.KunnDueDate),
    RepaymentStartDate: cleanDate(fields.contract.RepaymentStartDate),

    Note: noteText || null,
    RateHistory: fields.rateHistory.length > 0 ? fields.rateHistory : null,
    CollateralIds: fields.collateralIds.length > 0 ? fields.collateralIds.join(',') : null,
    PenaltySurcharge: parseFloat(fields.conditionSurcharge) || 0,

    ContractAmount: creditLimit,
    LoanAmount: loanAmount,
    CurrentBalance: currentBalance,

    MonthlyPrincipalAmount: isBulletPrincipal(fields.contract)
      ? null
      : (parseMoneyDecimalInput(fields.monthlyPrincipal) || null),

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
