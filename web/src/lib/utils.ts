export function formatMoneyInput(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
}

export function parseMoneyInput(value: string): number {
  if (!value) return 0;
  const digits = value.replace(/\D/g, '');
  return parseFloat(digits) || 0;
}
