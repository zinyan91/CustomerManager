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
  Hammer,
  GraduationCap,
  Coins,
} from 'lucide-react';

export type HubTaskGroupId = 'credit' | 'estimate' | 'lookup';

export interface HubTaskItem {
  id: string;
  groupId: HubTaskGroupId;
  name: string;
  shortName: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
  color: {
    borderLeft: string;
    iconBg: string;
    iconColor: string;
    hoverBorder: string;
    hoverText: string;
    activeTab: string;
  };
}

export const HUB_TASK_GROUPS = [
  {
    id: 'credit' as HubTaskGroupId,
    title: 'Hồ Sơ Tín Dụng & Kế Toán',
    badge: '4 tác vụ',
    dotColor: 'bg-blue-500',
    gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  },
  {
    id: 'estimate' as HubTaskGroupId,
    title: 'Dự Toán Thi Công, Mua Sắm & Bán Lẻ',
    badge: '4 tác vụ',
    dotColor: 'bg-orange-500',
    gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  },
  {
    id: 'lookup' as HubTaskGroupId,
    title: 'Tra Cứu Quy Định, Mã Phí & Ôn Tập Nghiệp Vụ',
    badge: '3 tác vụ',
    dotColor: 'bg-indigo-500',
    gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  },
] as const;

export const HUB_TASKS: HubTaskItem[] = [
  // 1. Nhóm Hồ sơ tín dụng & Giải ngân
  {
    id: 'templates',
    groupId: 'credit',
    name: 'Hồ Sơ Chứng Từ & Soạn Hợp Đồng',
    shortName: 'Hồ sơ chứng từ',
    path: '/hub/documents',
    icon: FileSignature,
    keywords: ['chung tu', 'hop dong', 'ho so', 'bieu mau', 'template', 'the tin dung', 'thue nha', 'van hanh'],
    color: {
      borderLeft: 'border-l-blue-500',
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
      iconColor: 'text-blue-600 dark:text-blue-400',
      hoverBorder: 'hover:border-blue-500/60',
      hoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
      activeTab: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40',
    },
  },
  {
    id: 'disbursement',
    groupId: 'credit',
    name: 'Thông Tin Giải Ngân & Thụ Hưởng',
    shortName: 'Thông tin giải ngân',
    path: '/hub/disbursement',
    icon: Landmark,
    keywords: ['thong tin giai ngan', 'giai ngan', 'thu huong', 'stk', 'ngan hang', 'disbursement', 'payee'],
    color: {
      borderLeft: 'border-l-emerald-500',
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      hoverBorder: 'hover:border-emerald-500/60',
      hoverText: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
      activeTab: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40',
    },
  },
  {
    id: 'corporate-financial',
    groupId: 'credit',
    name: 'Báo Cáo Tài Chính Doanh Nghiệp (TT 133)',
    shortName: 'BCTC Doanh nghiệp',
    path: '/hub/corporate-financial',
    icon: Building2,
    keywords: ['bctc', 'doanh nghiep', 'bao cao tai chinh', 'tt133', 'can doi ke toan', 'ket qua kinh doanh'],
    color: {
      borderLeft: 'border-l-sky-500',
      iconBg: 'bg-sky-500/10 dark:bg-sky-500/15',
      iconColor: 'text-sky-600 dark:text-sky-400',
      hoverBorder: 'hover:border-sky-500/60',
      hoverText: 'group-hover:text-sky-600 dark:group-hover:text-sky-400',
      activeTab: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/40',
    },
  },
  {
    id: 'cof',
    groupId: 'credit',
    name: 'Mua Bán Vốn Nội Bộ (COF)',
    shortName: 'Mua bán vốn (COF)',
    path: '/hub/cof',
    icon: Coins,
    keywords: ['mua ban von', 'von noi bo', 'cof', 'cost of funds', 'ftp', 'lai suat dieu hanh', 'gia von'],
    color: {
      borderLeft: 'border-l-cyan-500',
      iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      hoverBorder: 'hover:border-cyan-500/60',
      hoverText: 'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
      activeTab: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/40',
    },
  },

  // 2. Nhóm Dự toán, Mua sắm & Hóa đơn
  {
    id: 'estimate',
    groupId: 'estimate',
    name: 'Bảng Dự Toán Thi Công Sửa Chữa',
    shortName: 'Dự toán thi công',
    path: '/hub/estimate',
    icon: Hammer,
    keywords: ['du toan', 'thi cong', 'sua chua nha', 'xay nha', 'cong trinh', 'hang muc', 'estimate', 'boc tach'],
    color: {
      borderLeft: 'border-l-orange-500',
      iconBg: 'bg-orange-500/10 dark:bg-orange-500/15',
      iconColor: 'text-orange-600 dark:text-orange-400',
      hoverBorder: 'hover:border-orange-500/60',
      hoverText: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
      activeTab: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/40',
    },
  },
  {
    id: 'shopping-checklist',
    groupId: 'estimate',
    name: 'Dự Toán Mua Sắm Vật Dụng',
    shortName: 'Vật dụng mua sắm',
    path: '/hub/shopping',
    icon: PackageCheck,
    keywords: ['mua sam', 'vat dung', 'noi that', 'checklist', 'du toan', 'tang', 'phong'],
    color: {
      borderLeft: 'border-l-amber-500',
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
      hoverBorder: 'hover:border-amber-500/60',
      hoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
      activeTab: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40',
    },
  },
  {
    id: 'retail-invoice',
    groupId: 'estimate',
    name: 'Lập & In Hóa Đơn Bán Lẻ',
    shortName: 'Hóa đơn bán lẻ',
    path: '/hub/invoice',
    icon: Receipt,
    keywords: ['hoa don', 'ban le', 'invoice', 'bien lai', 'thanh toan'],
    color: {
      borderLeft: 'border-l-violet-500',
      iconBg: 'bg-violet-500/10 dark:bg-violet-500/15',
      iconColor: 'text-violet-600 dark:text-violet-400',
      hoverBorder: 'hover:border-violet-500/60',
      hoverText: 'group-hover:text-violet-600 dark:group-hover:text-violet-400',
      activeTab: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/40',
    },
  },
  {
    id: 'purchase-statement',
    groupId: 'estimate',
    name: 'Bảng Kê Thu Mua Hàng Hóa',
    shortName: 'Bảng kê thu mua',
    path: '/hub/statement',
    icon: ClipboardList,
    keywords: ['bang ke', 'thu mua', 'statement', 'tt133', 'nong san'],
    color: {
      borderLeft: 'border-l-teal-500',
      iconBg: 'bg-teal-500/10 dark:bg-teal-500/15',
      iconColor: 'text-teal-600 dark:text-teal-400',
      hoverBorder: 'hover:border-teal-500/60',
      hoverText: 'group-hover:text-teal-600 dark:group-hover:text-teal-400',
      activeTab: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/40',
    },
  },

  // 3. Nhóm Cổng Tra cứu quy định & Biểu phí
  {
    id: 'mdsdv',
    groupId: 'lookup',
    name: 'Tra Cứu Mục Đích SDV',
    shortName: 'Tra cứu MDSDV',
    path: '/hub/mdsdv',
    icon: Target,
    keywords: ['mdsdv', 'muc dich', 'su dung von', 'ma nganh', 'thau chi', 'nhnn'],
    color: {
      borderLeft: 'border-l-rose-500',
      iconBg: 'bg-rose-500/10 dark:bg-rose-500/15',
      iconColor: 'text-rose-600 dark:text-rose-400',
      hoverBorder: 'hover:border-rose-500/60',
      hoverText: 'group-hover:text-rose-600 dark:group-hover:text-rose-400',
      activeTab: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40',
    },
  },
  {
    id: 'card-policies',
    groupId: 'lookup',
    name: 'Tra Cứu Mã Phí & Quy Định Thẻ',
    shortName: 'Mã phí & Quy định thẻ',
    path: '/hub/card-fees',
    icon: CreditCard,
    keywords: ['the', 'ma phi', 'chinh sach the', 'card', 'visa', 'mastercard', 'napas'],
    color: {
      borderLeft: 'border-l-indigo-500',
      iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      hoverBorder: 'hover:border-indigo-500/60',
      hoverText: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
      activeTab: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/40',
    },
  },
  {
    id: 'quiz-bank',
    groupId: 'lookup',
    name: 'Ôn Tập Nghiệp Vụ Tín Dụng',
    shortName: 'Ôn tập nghiệp vụ',
    path: '/hub/quiz',
    icon: GraduationCap,
    keywords: ['on tap', 'nghiep vu', 'tin dung', 'quiz', 'cau hoi', 'trac nghiem', 'kiem tra', 'knowledge', 'hoc tap'],
    color: {
      borderLeft: 'border-l-fuchsia-500',
      iconBg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/15',
      iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
      hoverBorder: 'hover:border-fuchsia-500/60',
      hoverText: 'group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400',
      activeTab: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/40',
    },
  },
];
