export type RateProgramKind = 'cho_vay_ngan_han' | 'cho_vay_trung_dai_han' | 'huy_dong';
export type DepositChannel = 'quay' | 'online' | 'ftp';
export type DepositPayoutMode = 'cuoi_ky' | 'hang_thang' | 'hang_quy' | 'tra_truoc';

export interface RateProgram {
  Id: number;
  Kind: RateProgramKind;
  Name: string;
  DocumentNumber: string;
  DocumentDate?: string | null;
  EffectiveFrom: string;
  EffectiveTo?: string | null;
  QuotaVnd?: number | null;
  FloatingBaseLabel?: string | null;
  FloatingSpreadAnnual?: number | null;
  RateResetMonths?: number | null;
  MinFeeAmountVnd?: number | null;
  NewCustomerFeeDiscount?: number | null;
  CasaShortfallFeeAddon?: number | null;
  CasaMinRatio?: number | null;
  AllowRateReduction: boolean;
  AllowPrepayFeeWaive: boolean;
  SourceVerified: boolean;
  Note?: string | null;
  ScopeText?: string | null;
  TargetText?: string | null;
}

export interface RateProgramTier {
  Id: number;
  ProgramId: number;
  PackageCode?: string | null;
  Label: string;
  FixedMonths?: number | null;
  MinTenorMonths?: number | null;
  MinFeeRatio?: number | null;
  Channel?: DepositChannel | null;
  BalanceTierLabel?: string | null;
  PayoutMode?: DepositPayoutMode | null;
  TenorMonths?: number | null;
  RateAnnual?: number | null;
  SortOrder: number;
  Note?: string | null;
}

export interface RateProgramPrepaymentFee {
  Id: number;
  ProgramId: number;
  YearFrom: number;
  YearTo?: number | null;
  FeeRatio?: number | null;
  AppliesTo?: string | null;
  Note?: string | null;
}

export type FbeCodeScope = 'co_dinh_suot_thoi_gian_vay' | 'co_dinh_ky_dau' | 'data_udf';

export interface RateProgramFbeCode {
  Id: number;
  ProgramId: number;
  Scope: FbeCodeScope;
  Applies: string;
  RateIdCode?: string | null;
  Description?: string | null;
  RateIdValue?: string | null;
  SortOrder: number;
}

export interface DepositRateAuthority {
  Id: number;
  ProgramId: number;
  TenorLabel: string;
  AuthorityLevel: string;
  CurrentRate?: number | null;
  AdjustedRate?: number | null;
  SortOrder: number;
}

export interface RateProgramFeeOption {
  Id: number;
  ProgramId: number;
  OptionLabel: string;
  PackageGroup: string;
  MinFeeRatio?: number | null;
  CounterFeeRatio?: number | null;
  Note?: string | null;
  SortOrder: number;
}

export interface RateProgramCondition {
  Id: number;
  ProgramId: number;
  Heading?: string | null;
  Content: string;
  SortOrder: number;
}

export const FBE_SCOPE_LABELS: Record<FbeCodeScope, string> = {
  co_dinh_suot_thoi_gian_vay: 'Cố định lãi suất suốt thời gian vay',
  co_dinh_ky_dau: 'Cố định lãi suất kỳ đầu',
  data_udf: 'Data UDF (Vietbank UDF Lending Account)',
};

function isNum(v?: number | null): v is number {
  return v !== null && v !== undefined && !isNaN(v);
}

export function findActiveProgram(
  programs: RateProgram[],
  kind: RateProgramKind,
  onDate: string
): RateProgram | null {
  if (!programs || programs.length === 0 || !onDate) return null;

  const candidates = programs.filter(p =>
    p.Kind === kind
    && p.EffectiveFrom <= onDate
    && (!p.EffectiveTo || p.EffectiveTo >= onDate)
  );
  if (candidates.length === 0) return null;

  return candidates.reduce((best, p) =>
    p.EffectiveFrom > best.EffectiveFrom ? p : best
  );
}

export interface ProgramPeriod {
  id?: number | null;
  kind: RateProgramKind;
  effectiveFrom: string;
  effectiveTo: string | null;
}

function fmtVn(d?: string | null): string {
  const p = (d || '').split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : (d || 'không giới hạn');
}

export function findOverlappingPrograms(
  programs: RateProgram[],
  period: ProgramPeriod
): RateProgram[] {
  const from = (period.effectiveFrom || '').trim();
  if (!from) return [];
  const to = (period.effectiveTo || '').trim() || null;

  return (programs || []).filter(p => {
    if (p.Kind !== period.kind) return false;
    if (period.id !== null && period.id !== undefined && p.Id === period.id) return false;

    const otherTo = (p.EffectiveTo || '').trim() || null;
    const startsBeforeOtherEnds = otherTo === null || from <= otherTo;
    const otherStartsBeforeThisEnds = to === null || p.EffectiveFrom <= to;
    return startsBeforeOtherEnds && otherStartsBeforeThisEnds;
  });
}

// Chương trình cùng loại bắt đầu ĐÚNG cùng một ngày là trường hợp resolver
// (findActiveProgram) không phân định được bản nào áp dụng — vì nó chọn bản có
// EffectiveFrom mới nhất, hai bản cùng ngày bắt đầu sẽ hoà. Đây là ràng buộc
// duy nhất còn giữ; mọi chồng lấn khác đều hợp lệ (bản mới nhất đè bản cũ).
export function findSameStartProgram(
  programs: RateProgram[],
  period: ProgramPeriod
): RateProgram | null {
  const from = (period.effectiveFrom || '').trim();
  if (!from) return null;
  return (programs || []).find(p => {
    if (p.Kind !== period.kind) return false;
    if (period.id !== null && period.id !== undefined && p.Id === period.id) return false;
    return (p.EffectiveFrom || '').trim() === from;
  }) ?? null;
}

export function checkProgramPeriod(
  programs: RateProgram[],
  period: ProgramPeriod
): { ok: boolean; message: string } {
  const from = (period.effectiveFrom || '').trim();
  const to = (period.effectiveTo || '').trim() || null;

  if (!from) {
    return { ok: false, message: 'Phải khai ngày bắt đầu hiệu lực.' };
  }
  if (to !== null && to < from) {
    return { ok: false, message: 'Ngày hết hiệu lực không được trước ngày bắt đầu.' };
  }

  // Cho phép chồng lấn: nghiệp vụ thường ra công văn mới trước khi kỳ cũ hết để
  // áp liền sau đó, và resolver đã chọn bản EffectiveFrom mới nhất. Chỉ chặn khi
  // trùng ĐÚNG ngày bắt đầu với một chương trình cùng loại (không xác định được).
  const twin = findSameStartProgram(programs, period);
  if (twin) {
    return {
      ok: false,
      message: `Đã có chương trình cùng loại bắt đầu đúng ngày ${fmtVn(from)}: `
        + `${twin.DocumentNumber} (${fmtVn(twin.EffectiveFrom)} → ${fmtVn(twin.EffectiveTo)}). `
        + 'Hai chương trình cùng ngày bắt đầu sẽ không xác định được bản nào áp dụng — '
        + 'đổi ngày hiệu lực từ, hoặc sửa/đóng chương trình đó.',
    };
  }

  return { ok: true, message: '' };
}

export function isProgramExpired(program: RateProgram | null, onDate: string): boolean {
  if (!program || !onDate) return false;
  return !!program.EffectiveTo && program.EffectiveTo < onDate;
}

export function resolvePostFixedRate(
  baseRateAnnual: number | null | undefined,
  spreadAnnual: number | null | undefined
): number | null {
  if (!isNum(baseRateAnnual) || !isNum(spreadAnnual)) return null;
  return baseRateAnnual + spreadAnnual;
}

export interface ServiceFeeInput {
  disbursementAmount: number;
  feeRatio?: number | null;
  minFeeAmountVnd?: number | null;
  casaAverage?: number | null;
  casaMinRatio?: number | null;
  casaShortfallAddon?: number | null;
  newCustomerDiscount?: number | null;
}

export interface ServiceFeeResult {
  baseRatio: number | null;
  casaAddonApplied: boolean;
  casaRequiredAmount: number | null;
  discountApplied: number;
  effectiveRatio: number | null;
  feeFromRatio: number | null;
  feeAmount: number | null;
  minFeeApplied: boolean;
}

export function calcServiceFee(input: ServiceFeeInput): ServiceFeeResult {
  const amount = isNum(input.disbursementAmount) ? Math.max(0, input.disbursementAmount) : 0;
  const baseRatio = isNum(input.feeRatio) ? input.feeRatio : null;
  const minFee = isNum(input.minFeeAmountVnd) ? input.minFeeAmountVnd : null;

  const casaMinRatio = isNum(input.casaMinRatio) ? input.casaMinRatio : null;
  const casaRequiredAmount = casaMinRatio === null ? null : amount * casaMinRatio;
  const casaAddon = isNum(input.casaShortfallAddon) ? input.casaShortfallAddon : 0;

  const casaAddonApplied =
    casaRequiredAmount !== null
    && isNum(input.casaAverage)
    && input.casaAverage < casaRequiredAmount;

  const discount = isNum(input.newCustomerDiscount)
    ? Math.min(1, Math.max(0, input.newCustomerDiscount))
    : 0;

  if (baseRatio === null) {
    return {
      baseRatio: null,
      casaAddonApplied,
      casaRequiredAmount,
      discountApplied: discount,
      effectiveRatio: null,
      feeFromRatio: null,
      feeAmount: null,
      minFeeApplied: false,
    };
  }

  const discountedRatio = baseRatio * (1 - discount);
  const effectiveRatio = discountedRatio + (casaAddonApplied ? casaAddon : 0);
  const feeFromRatio = Math.round(amount * effectiveRatio);
  const feeAmount = minFee === null ? feeFromRatio : Math.max(feeFromRatio, minFee);

  return {
    baseRatio,
    casaAddonApplied,
    casaRequiredAmount,
    discountApplied: discount,
    effectiveRatio,
    feeFromRatio,
    feeAmount,
    minFeeApplied: minFee !== null && feeAmount > feeFromRatio,
  };
}

export function findPrepaymentFee(
  fees: RateProgramPrepaymentFee[],
  year: number
): RateProgramPrepaymentFee | null {
  if (!fees || fees.length === 0 || !isNum(year) || year < 1) return null;
  const match = fees.find(f =>
    year >= f.YearFrom && (f.YearTo === null || f.YearTo === undefined || year <= f.YearTo)
  );
  return match ?? null;
}

export function calcDepositInterest(
  principal: number,
  rateAnnual: number | null | undefined,
  days: number
): number | null {
  if (!isNum(rateAnnual)) return null;
  const p = isNum(principal) ? Math.max(0, principal) : 0;
  const d = isNum(days) ? Math.max(0, days) : 0;
  return Math.round(p * rateAnnual * (d / 365));
}

export interface QuoteWarning {
  level: 'block' | 'warn';
  message: string;
}

export interface QuoteWarningInput {
  program: RateProgram | null;
  tier?: RateProgramTier | null;
  onDate?: string;
  loanTenorMonths?: number | null;
}

export function collectQuoteWarnings(input: QuoteWarningInput): QuoteWarning[] {
  const warnings: QuoteWarning[] = [];
  const { program, tier } = input;

  if (!program) {
    warnings.push({
      level: 'block',
      message: 'Không có chương trình lãi suất hiệu lực tại ngày đã chọn. Không được chào lãi suất.',
    });
    return warnings;
  }

  if (!program.SourceVerified) {
    warnings.push({
      level: 'block',
      message: `Số liệu chương trình "${program.DocumentNumber}" chưa đối chiếu văn bản gốc. Chỉ dùng để tham khảo nội bộ, không chào khách.`,
    });
  }

  if (input.onDate && isProgramExpired(program, input.onDate)) {
    warnings.push({
      level: 'block',
      message: `Chương trình đã hết hiệu lực ngày ${program.EffectiveTo}.`,
    });
  }

  if (!program.AllowRateReduction) {
    warnings.push({
      level: 'warn',
      message: 'Chương trình không áp dụng thẩm quyền giảm LSCV trong suốt thời gian vay.',
    });
  }

  if (!program.AllowPrepayFeeWaive) {
    warnings.push({
      level: 'warn',
      message: 'Chương trình không áp dụng thẩm quyền giảm phí trả nợ trước hạn.',
    });
  }

  if (tier) {
    if (!isNum(tier.RateAnnual)) {
      warnings.push({
        level: 'block',
        message: `Gói "${tier.Label}" chưa có lãi suất trong hệ thống. Cần nhập theo văn bản trước khi chào.`,
      });
    }
    if (
      isNum(input.loanTenorMonths)
      && isNum(tier.MinTenorMonths)
      && input.loanTenorMonths < tier.MinTenorMonths
    ) {
      warnings.push({
        level: 'warn',
        message: `Thời gian vay ${input.loanTenorMonths} tháng thấp hơn mức tối thiểu ${tier.MinTenorMonths} tháng của gói này.`,
      });
    }
  }

  return warnings;
}

export function hasBlockingWarning(warnings: QuoteWarning[]): boolean {
  return warnings.some(w => w.level === 'block');
}

export const PAYOUT_MODE_LABELS: Record<DepositPayoutMode, string> = {
  cuoi_ky: 'Lãi cuối kỳ',
  hang_thang: 'Lãi hàng tháng',
  hang_quy: 'Lãi hàng quý',
  tra_truoc: 'Lãi trả trước',
};

export const CHANNEL_LABELS: Record<DepositChannel, string> = {
  quay: 'Tại quầy',
  online: 'Online',
  ftp: 'FTP mua nội bộ',
};

export const KIND_LABELS: Record<RateProgramKind, string> = {
  cho_vay_ngan_han: 'Cho vay ngắn hạn',
  cho_vay_trung_dai_han: 'Cho vay trung dài hạn',
  huy_dong: 'Huy động',
};

export interface DepositRateRow {
  key: string;
  balanceTierLabel: string;
  tenorMonths: number | null;
  payoutMode: DepositPayoutMode | null;
  label: string;
  sortOrder: number;
  byChannel: Partial<Record<DepositChannel, number | null>>;
  tierIdByChannel: Partial<Record<DepositChannel, number>>;
}

export function buildDepositRateRows(tiers: RateProgramTier[]): DepositRateRow[] {
  const map = new Map<string, DepositRateRow>();

  for (const t of tiers) {
    const bac = (t.BalanceTierLabel || '').trim();
    const key = [bac, t.TenorMonths ?? '', t.PayoutMode ?? ''].join('|');

    let row = map.get(key);
    if (!row) {
      row = {
        key,
        balanceTierLabel: bac,
        tenorMonths: t.TenorMonths ?? null,
        payoutMode: t.PayoutMode ?? null,
        label: t.Label,
        sortOrder: t.SortOrder,
        byChannel: {},
        tierIdByChannel: {},
      };
      map.set(key, row);
    }

    if (t.SortOrder < row.sortOrder) row.sortOrder = t.SortOrder;

    const ch = t.Channel;
    if (ch) {
      row.byChannel[ch] = t.RateAnnual ?? null;
      row.tierIdByChannel[ch] = t.Id;
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return (a.tenorMonths ?? 0) - (b.tenorMonths ?? 0);
  });
}

export function depositChannelsPresent(tiers: RateProgramTier[]): DepositChannel[] {
  const order: DepositChannel[] = ['quay', 'online'];
  const co = new Set(tiers.map(t => t.Channel).filter(Boolean) as DepositChannel[]);
  return order.filter(ch => co.has(ch));
}
