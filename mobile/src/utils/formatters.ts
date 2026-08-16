export function formatVND(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  if (Math.abs(amount) >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2).replace(/\.00$/, '')} tỷ ₫`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')} tr ₫`;
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return dateString;
  }
}

export function formatRate(rate?: number | null): string {
  if (rate === undefined || rate === null || isNaN(rate)) return '-';
  const val = rate < 1 ? rate * 100 : rate;
  return `${val.toFixed(2).replace(/\.00$/, '')}%/năm`;
}

export function getDebtGroupBadge(group?: number) {
  switch (group) {
    case 1:
      return { label: 'Nhóm 1 (Chuẩn)', color: '#059669', bg: '#ECFDF5', dot: '#10B981' };
    case 2:
      return { label: 'Nhóm 2 (Cần chú ý)', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' };
    case 3:
      return { label: 'Nhóm 3 (Dưới chuẩn)', color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' };
    case 4:
      return { label: 'Nhóm 4 (Nghi ngờ)', color: '#B91C1C', bg: '#FEF2F2', dot: '#DC2626' };
    case 5:
      return { label: 'Nhóm 5 (Mất vốn)', color: '#991B1B', bg: '#FEE2E2', dot: '#7F1D1D' };
    default:
      return { label: 'Nhóm 1 (Chuẩn)', color: '#059669', bg: '#ECFDF5', dot: '#10B981' };
  }
}
