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

export interface ParsedCustomerSnippet {
  cif?: string;
  fullName?: string;
  nationalId?: string;
  phone?: string;
  email?: string;
  accountNumber?: string;
  address?: string;
}

export function parseRawCustomerText(raw: string): ParsedCustomerSnippet {
  if (!raw || !raw.trim()) return {};
  const text = raw.trim();
  const res: ParsedCustomerSnippet = {};

  const cifMatch = text.match(/(?:cif|mã cif|ma cif)[\s:=-]+([0-9]{6,12})/i);
  if (cifMatch) {
    res.cif = cifMatch[1].trim();
  }

  const cccdMatch = text.match(/(?:cccd|cmnd|số cccd|so cccd|số cmnd|so cmnd|căn cước)[\s:=-]+([0-9\s]{9,16})/i);
  if (cccdMatch) {
    res.nationalId = digitsOnly(cccdMatch[1]);
  }

  const phoneMatch = text.match(/(?:sđt|sdt|đt|dt|phone|tel|di động|di dong)[\s:=-]+([0-9\s/;,.-]{10,30})/i);
  if (phoneMatch) {
    res.phone = capNumberList(phoneMatch[1], PHONE_LENGTH);
  }

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    res.email = emailMatch[0].trim();
  }

  const stkMatch = text.match(/(?:stk|số tk|so tk|tài khoản|tai khoan|acct|account)[\s:=-]+([0-9\s/;,.-]{8,40})/i);
  if (stkMatch) {
    res.accountNumber = normalizeNumberList(stkMatch[1]);
  }

  const nameMatch = text.match(/(?:họ và tên|họ tên|ho ten|tên kh|ten kh|khách hàng|khach hang|kh)[\s:=-]+([^\n,;|–-]+)/i);
  if (nameMatch) {
    res.fullName = nameMatch[1].trim().toUpperCase();
  }

  const addrMatch = text.match(/(?:địa chỉ|dia chi|đc|dc|address)[\s:=-]+([^\n;]+)/i);
  if (addrMatch) {
    res.address = addrMatch[1].trim();
  }

  // Fallback: If not labeled, split by pipe or tab
  if (!res.cif && !res.fullName) {
    const parts = text.split(/[|\t]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      for (const part of parts) {
        const d = digitsOnly(part);
        if (!res.cif && d.length >= 6 && d.length <= 9) {
          res.cif = d;
        } else if (!res.nationalId && (d.length === 9 || d.length === 12)) {
          res.nationalId = d;
        } else if (!res.phone && d.length === 10 && (d.startsWith('09') || d.startsWith('08') || d.startsWith('07') || d.startsWith('03') || d.startsWith('05'))) {
          res.phone = d;
        } else if (!res.fullName && /[a-zA-ZÀ-ỹ\s]{3,}/.test(part) && !part.includes('@')) {
          res.fullName = part.toUpperCase();
        } else if (!res.email && part.includes('@')) {
          res.email = part;
        }
      }
    }
  }

  return res;
}

