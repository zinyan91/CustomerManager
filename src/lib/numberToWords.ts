const ONES = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

const GROUP_UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

export const MAX_SUPPORTED = Number.MAX_SAFE_INTEGER;

function readTriple(value: number, readLeadingZeros: boolean): string {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const units = value % 10;
  const parts: string[] = [];

  if (hundreds > 0 || readLeadingZeros) {
    parts.push(`${ONES[hundreds]} trăm`);
  }

  if (tens === 0) {
    if (units > 0) {
      if (hundreds > 0 || readLeadingZeros) parts.push('lẻ');
      parts.push(ONES[units]);
    }
  } else if (tens === 1) {
    parts.push('mười');
    if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(ONES[units]);
  } else {
    parts.push(`${ONES[tens]} mươi`);
    if (units === 1) parts.push('mốt');
    else if (units === 4) parts.push('tư');
    else if (units === 5) parts.push('lăm');
    else if (units > 0) parts.push(ONES[units]);
  }

  return parts.join(' ');
}

export function numberToVietnameseWords(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  if (!isFinite(value)) return '';

  const rounded = Math.round(value);
  if (Math.abs(rounded) > MAX_SUPPORTED) return '';
  if (rounded === 0) return 'không';

  const negative = rounded < 0;
  let remaining = Math.abs(rounded);

  const groups: number[] = [];
  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const highestIndex = groups.length - 1;
  const spoken: string[] = [];

  for (let i = highestIndex; i >= 0; i--) {
    if (groups[i] === 0) continue;
    const text = readTriple(groups[i], i !== highestIndex);
    const unit = GROUP_UNITS[i] ?? '';
    spoken.push(unit ? `${text} ${unit}` : text);
  }

  const body = spoken.join(' ').replace(/\s+/g, ' ').trim();
  return negative ? `âm ${body}` : body;
}

export function capitaliseFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function moneyToVietnameseWords(
  value: number | null | undefined,
  options: { currency?: string; capitalise?: boolean } = {}
): string {
  const words = numberToVietnameseWords(value);
  if (!words) return '';
  const currency = options.currency === undefined ? 'đồng' : options.currency;
  const full = currency ? `${words} ${currency}` : words;
  return options.capitalise === false ? full : capitaliseFirst(full);
}

export function parseMoneyText(text: string | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  const digits = String(text).replace(/\D/g, '');
  if (!digits) return null;
  const value = parseInt(digits, 10);
  return isNaN(value) ? null : value;
}

export function moneyTextToWords(
  text: string | null | undefined,
  options?: { currency?: string; capitalise?: boolean }
): string {
  const value = parseMoneyText(text);
  if (value === null) return '';
  return moneyToVietnameseWords(value, options);
}
