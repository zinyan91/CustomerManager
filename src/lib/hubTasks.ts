import type React from 'react';
import {
  FileSignature,
  Target,
  CreditCard,
  PackageCheck,
  Receipt,
  ClipboardList,
  Building2,
  Landmark,
} from 'lucide-react';

export interface HubTaskItem {
  id: string;
  name: string;
  shortName: string;
  path: string;
  icon: React.ElementType;
}

export const HUB_TASKS: HubTaskItem[] = [
  {
    id: 'templates',
    name: 'Hồ Sơ Chứng Từ & Soạn Hợp Đồng',
    shortName: 'Hồ sơ chứng từ',
    path: '/hub/documents',
    icon: FileSignature,
  },
  {
    id: 'disbursement',
    name: 'Thông Tin Giải Ngân & Thụ Hưởng',
    shortName: 'Thông tin giải ngân',
    path: '/hub/disbursement',
    icon: Landmark,
  },
  {
    id: 'mdsdv',
    name: 'Tra Cứu Mục Đích SDV',
    shortName: 'Tra cứu MDSDV',
    path: '/hub/mdsdv',
    icon: Target,
  },
  {
    id: 'card-policies',
    name: 'Tra Cứu Mã Phí & Quy Định Thẻ',
    shortName: 'Mã phí & Quy định thẻ',
    path: '/hub/card-fees',
    icon: CreditCard,
  },
  {
    id: 'corporate-financial',
    name: 'Báo Cáo Tài Chính Doanh Nghiệp (TT 133)',
    shortName: 'BCTC Doanh nghiệp',
    path: '/hub/corporate-financial',
    icon: Building2,
  },
  {
    id: 'shopping-checklist',
    name: 'Dự Toán Mua Sắm Vật Dụng',
    shortName: 'Vật dụng mua sắm',
    path: '/hub/shopping',
    icon: PackageCheck,
  },
  {
    id: 'retail-invoice',
    name: 'Lập Hóa Đơn Bán Lẻ',
    shortName: 'Hóa đơn bán lẻ',
    path: '/hub/invoice',
    icon: Receipt,
  },
  {
    id: 'purchase-statement',
    name: 'Bảng Kê Thu Mua Hàng Hóa',
    shortName: 'Bảng kê thu mua',
    path: '/hub/statement',
    icon: ClipboardList,
  },
];
