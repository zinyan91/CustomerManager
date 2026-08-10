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

export function validateNationalId(value: string | null | undefined, label: string): string | null {
  const digits = digitsOnly(value);
  if (digits.length === 0) return null;
  if (digits.length === NATIONAL_ID_CCCD_LENGTH) return null;
  if (digits.length === NATIONAL_ID_CMND_LENGTH) return null;
  return `${label} phải là ${NATIONAL_ID_CMND_LENGTH} số (CMND) hoặc `
    + `${NATIONAL_ID_CCCD_LENGTH} số (CCCD) — đang có ${digits.length} số.`;
}

export function validatePhone(value: string | null | undefined, label: string): string | null {
  const digits = digitsOnly(value);
  if (digits.length === 0) return null;
  if (digits.length === PHONE_LENGTH) return null;
  return `${label} phải đúng ${PHONE_LENGTH} số — đang có ${digits.length} số.`;
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
