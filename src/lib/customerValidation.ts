export const NATIONAL_ID_CCCD_LENGTH = 12;
export const NATIONAL_ID_CMND_LENGTH = 9;
export const PHONE_LENGTH = 10;

export function digitsOnly(value?: string | null): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

export function capDigits(value: string | null | undefined, max: number): string {
  return digitsOnly(value).slice(0, max);
}

export const LIST_SEPARATOR = ' / ';

export function splitNumberList(value: string | null | undefined): string[] {
  if (!value) return [];
  return String(value)
    .split(/[;,/\n|]+/)
    .map(part => part.trim())
    .filter(part => part.length > 0);
}

export function normalizeNumberList(value: string | null | undefined): string {
  if (!value) return '';
  const trailing = /[;,/\n|]\s*$/.test(String(value));
  const joined = splitNumberList(value).map(part => digitsOnly(part)).filter(Boolean).join(LIST_SEPARATOR);
  if (!joined) return '';
  return trailing ? `${joined}${LIST_SEPARATOR}` : joined;
}

export function capNumberList(
  value: string | null | undefined, maxPerItem: number
): string {
  if (!value) return '';
  const trailing = /[;,/\n|]\s*$/.test(String(value));
  const parts = splitNumberList(value).map(part => digitsOnly(part).slice(0, maxPerItem));
  const joined = parts.filter(p => p.length > 0).join(LIST_SEPARATOR);
  if (parts.length === 0) return '';
  return trailing ? `${joined}${LIST_SEPARATOR}` : joined;
}

export function validateNationalId(value: string | null | undefined, label: string): string | null {
  const digits = digitsOnly(value);
  if (digits.length === 0) return null;
  if (digits.length === NATIONAL_ID_CCCD_LENGTH) return null;
  if (digits.length === NATIONAL_ID_CMND_LENGTH) return null;
  return `${label} phải là ${NATIONAL_ID_CMND_LENGTH} số (CMND) hoặc `
    + `${NATIONAL_ID_CCCD_LENGTH} số (CCCD) — đang có ${digits.length} số.`;
}

export function validatePhone(value: string | null | undefined, label: string): string | null {
  const parts = splitNumberList(value);
  if (parts.length === 0) return null;

  const sai = parts
    .map(part => digitsOnly(part))
    .filter(digits => digits.length !== PHONE_LENGTH);

  if (sai.length === 0) return null;
  if (parts.length === 1) {
    return `${label} phải đúng ${PHONE_LENGTH} số — đang có ${sai[0].length} số.`;
  }
  return `${label}: mỗi số phải đúng ${PHONE_LENGTH} số, `
    + `còn ${sai.length} số chưa đúng (${sai.map(d => `${d.length} số`).join(', ')}). `
    + `Nhiều số thì cách nhau bằng dấu "${LIST_SEPARATOR.trim()}".`;
}

export interface CustomerFormValues {
  nationalId?: string | null;
  phone?: string | null;
  spouseNationalId?: string | null;
  spousePhone?: string | null;
}

export function validateCustomerForm(values: CustomerFormValues): string[] {
  return [
    validateNationalId(values.nationalId, 'Số CCCD / CMND'),
    validatePhone(values.phone, 'Số điện thoại'),
    validateNationalId(values.spouseNationalId, 'Số CCCD KHLQ / Bảo lãnh'),
    validatePhone(values.spousePhone, 'Số điện thoại KHLQ / Bảo lãnh'),
  ].filter((m): m is string => m !== null);
}
