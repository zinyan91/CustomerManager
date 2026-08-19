import type { ElementType } from 'react';
import {
  BookOpen, LayoutDashboard, Users, FileText, Building2, CreditCard,
  ShieldAlert, Settings, Calculator, FileSignature, Target, Percent,
  Landmark, Handshake, ClipboardList, GraduationCap, Boxes, Receipt,
} from 'lucide-react';
import type { TranslationKey } from './i18n';

export type ScreenId =
  | 'dashboard'
  | 'customers' | 'credit-contracts' | 'loans' | 'collaterals' | 'credit-cards'
  | 'calculators' | 'business-plan' | 'inventory' | 'purchase-statement'
  | 'retail-invoice' | 'rate-quote' | 'cof'
  | 'mdsdv' | 'card-policies' | 'templates' | 'quiz-bank'
  | 'post-loan' | 'settings';

export interface NavItem {
  id: ScreenId;
  labelKey: TranslationKey;
  groupKey: TranslationKey;
  icon: ElementType;
  keywords: string[];
}

export interface NavGroup {
  groupKey: TranslationKey;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: 'nav.groupOverview',
    items: [
      { id: 'dashboard', labelKey: 'nav.dashboard', groupKey: 'nav.groupOverview', icon: LayoutDashboard, keywords: ['overview', 'tong quan', 'dashboard', 'danh muc'] },
    ],
  },
  {
    groupKey: 'nav.groupRecords',
    items: [
      { id: 'customers', labelKey: 'nav.customers', groupKey: 'nav.groupRecords', icon: Users, keywords: ['khach hang', 'danh sach', 'customer', 'cif'] },
      { id: 'credit-contracts', labelKey: 'nav.creditContracts', groupKey: 'nav.groupRecords', icon: Handshake, keywords: ['hop dong tin dung', 'hdtd', 'tin dung', 'contract'] },
      { id: 'loans', labelKey: 'nav.loans', groupKey: 'nav.groupRecords', icon: FileText, keywords: ['khoan vay', 'du no', 'loan', 'portfolio'] },
      { id: 'collaterals', labelKey: 'nav.collaterals', groupKey: 'nav.groupRecords', icon: Building2, keywords: ['tai san bao dam', 'tsbd', 'collateral', 'bat dong san'] },
      { id: 'credit-cards', labelKey: 'nav.creditCards', groupKey: 'nav.groupRecords', icon: CreditCard, keywords: ['the tin dung', 'card', 'han muc'] },
    ],
  },
  {
    groupKey: 'nav.groupBusinessTools',
    items: [
      { id: 'calculators', labelKey: 'nav.calculators', groupKey: 'nav.groupBusinessTools', icon: Calculator, keywords: ['tinh toan', 'lai suat', 'calculator', 'tra no'] },
      { id: 'business-plan', labelKey: 'nav.businessPlan', groupKey: 'nav.groupBusinessTools', icon: ClipboardList, keywords: ['phuong an kinh doanh', 'pakd', 'phuong an'] },
      { id: 'inventory', labelKey: 'nav.inventory', groupKey: 'nav.groupBusinessTools', icon: Boxes, keywords: ['ton kho', 'hang hoa', 'inventory'] },
      { id: 'purchase-statement', labelKey: 'nav.purchaseStatement', groupKey: 'nav.groupBusinessTools', icon: FileText, keywords: ['bang ke mua hang', 'hoa don', 'purchase'] },
      { id: 'retail-invoice', labelKey: 'nav.retailInvoice', groupKey: 'nav.groupBusinessTools', icon: Receipt, keywords: ['hoa don ban le', 'ban le', 'invoice'] },
      { id: 'rate-quote', labelKey: 'nav.rateQuote', groupKey: 'nav.groupBusinessTools', icon: Percent, keywords: ['dinh gia lai suat', 'lai suat', 'quote'] },
      { id: 'cof', labelKey: 'nav.cof', groupKey: 'nav.groupBusinessTools', icon: Landmark, keywords: ['gia von', 'cof', 'cost of funds'] },
    ],
  },
  {
    groupKey: 'nav.groupLookup',
    items: [
      { id: 'mdsdv', labelKey: 'nav.mdsdv', groupKey: 'nav.groupLookup', icon: Target, keywords: ['muc dich su dung von', 'mdsdv'] },
      { id: 'card-policies', labelKey: 'nav.cardPolicies', groupKey: 'nav.groupLookup', icon: BookOpen, keywords: ['chinh sach the', 'quy dinh', 'policy'] },
      { id: 'templates', labelKey: 'nav.templates', groupKey: 'nav.groupLookup', icon: FileSignature, keywords: ['bieu mau', 'chung tu', 'template'] },
      { id: 'quiz-bank', labelKey: 'nav.quizBank', groupKey: 'nav.groupLookup', icon: GraduationCap, keywords: ['ngan hang cau hoi', 'quiz', 'on tap'] },
    ],
  },
  {
    groupKey: 'nav.groupControl',
    items: [
      { id: 'post-loan', labelKey: 'nav.postLoan', groupKey: 'nav.groupControl', icon: ShieldAlert, keywords: ['kiem soat sau vay', 'kssv', 'post loan', 'kiem tra'] },
      { id: 'settings', labelKey: 'nav.settings', groupKey: 'nav.groupControl', icon: Settings, keywords: ['cai dat', 'he thong', 'settings', 'config'] },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);
