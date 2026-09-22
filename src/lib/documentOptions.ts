export const CCCD_ISSUE_PLACES = [
  'CCS QLHC về TTXH',
  'Bộ Công An',
] as const;

export const BANK_LIST = [
  'ABBANK',
  'ACB',
  'Agribank',
  'Bac A Bank',
  'BAOVIET Bank',
  'BIDV',
  'BVBank',
  'Eximbank',
  'GPBank',
  'HD Bank',
  'Kienlongbank',
  'LP Bank',
  'MB Bank',
  'MBV',
  'MSB',
  'Nam A Bank',
  'NCB',
  'OCB',
  'PGBank',
  'PVcomBank',
  'Sacombank',
  'SaigonBank',
  'SCB',
  'SeABank',
  'SHB',
  'Techcombank',
  'TPBank',
  'VBSP',
  'VCBNeo',
  'VDB',
  'VIB',
  'VietABank',
  'Vietbank',
  'Vietcombank',
  'Vietinbank',
  'Vikki Bank',
  'VPBank',
] as const;

export type PaymentMethodType = 'cash' | 'transfer';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  cash: 'Thanh toán tiền mặt',
  transfer: 'Thanh toán chuyển khoản',
};

export interface SaleSupportOfficer {
  cif: string;
  name: string;
}

export const SALE_SUPPORT_LIST: SaleSupportOfficer[] = [
  { cif: '003266029', name: 'NGUYỄN THANH TÙNG' },
  { cif: '005218997', name: 'NGUYỄN THỊ XUÂN NHƯ' },
  { cif: '005047615', name: 'NGUYỄN HỒNG PHÚC' },
  { cif: '005331002', name: 'NGUYỄN CHÍ CƯỜNG' },
  { cif: '005126275', name: 'NGÔ HUỲNH ANH TUẤN' },
];
