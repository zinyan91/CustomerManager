import type { ElementType } from 'react';
import {
  BookOpen, LayoutDashboard, Users, FileText, Building2, CreditCard,
  ShieldAlert, Settings, Calculator, FileSignature, Target, Percent,
  Landmark, Handshake, ClipboardList, GraduationCap, Boxes, Receipt,
  PackageCheck,
} from 'lucide-react';
import type { TranslationKey } from './i18n';
import { ROUTE_OF } from './routes';

export type ScreenId =
  | 'dashboard'
  | 'customers' | 'credit-contracts' | 'loans' | 'collaterals' | 'credit-cards'
  | 'calculators' | 'business-plan' | 'corporate-financial' | 'inventory' | 'shopping-checklist' | 'purchase-statement'
  | 'retail-invoice' | 'rate-quote' | 'cof'
  | 'mdsdv' | 'card-policies' | 'templates' | 'quiz-bank'
  | 'post-loan' | 'settings';

export interface NavItem {
  id: ScreenId;
  labelKey: TranslationKey;
  groupKey: TranslationKey;
  icon: ElementType;
  path: string;
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
      { id: 'dashboard', labelKey: 'nav.dashboard', groupKey: 'nav.groupOverview', icon: LayoutDashboard, path: ROUTE_OF.dashboard, keywords: ['overview', 'tong quan', 'dashboard', 'danh muc'] },
    ],
  },
  {
    groupKey: 'nav.groupRecords',
    items: [
      { id: 'customers', labelKey: 'nav.customers', groupKey: 'nav.groupRecords', icon: Users, path: ROUTE_OF.customers, keywords: ['khach hang', 'danh sach', 'customer', 'cif'] },
      { id: 'credit-contracts', labelKey: 'nav.creditContracts', groupKey: 'nav.groupRecords', icon: Handshake, path: ROUTE_OF['credit-contracts'], keywords: ['hop dong tin dung', 'hdtd', 'tin dung', 'contract'] },
      { id: 'loans', labelKey: 'nav.loans', groupKey: 'nav.groupRecords', icon: FileText, path: ROUTE_OF.loans, keywords: ['khoan vay', 'du no', 'loan', 'portfolio'] },
      { id: 'collaterals', labelKey: 'nav.collaterals', groupKey: 'nav.groupRecords', icon: Building2, path: ROUTE_OF.collaterals, keywords: ['tai san bao dam', 'tsbd', 'collateral', 'bat dong san'] },
      { id: 'credit-cards', labelKey: 'nav.creditCards', groupKey: 'nav.groupRecords', icon: CreditCard, path: ROUTE_OF['credit-cards'], keywords: ['the tin dung', 'card', 'han muc'] },
    ],
  },
  {
    groupKey: 'nav.groupBusinessTools',
    items: [
      { id: 'calculators', labelKey: 'nav.calculators', groupKey: 'nav.groupBusinessTools', icon: Calculator, path: ROUTE_OF.calculators, keywords: ['tinh toan', 'lai suat', 'calculator', 'tra no'] },
      { id: 'business-plan', labelKey: 'nav.businessPlan', groupKey: 'nav.groupBusinessTools', icon: ClipboardList, path: ROUTE_OF['business-plan'], keywords: ['phuong an kinh doanh', 'pakd', 'phuong an'] },
      { id: 'corporate-financial', labelKey: 'nav.corporateFinancial', groupKey: 'nav.groupBusinessTools', icon: Building2, path: ROUTE_OF['corporate-financial'], keywords: ['doanh nghiep', 'bctc', 'bao cao tai chinh', 'tt133', 'can doi ke toan', 'ket qua kinh doanh', 'b01a', 'b02', 'b01b'] },
      { id: 'inventory', labelKey: 'nav.inventory', groupKey: 'nav.groupBusinessTools', icon: Boxes, path: ROUTE_OF.inventory, keywords: ['ton kho', 'hang hoa', 'inventory'] },
      { id: 'shopping-checklist', labelKey: 'nav.shoppingChecklist', groupKey: 'nav.groupBusinessTools', icon: PackageCheck, path: ROUTE_OF['shopping-checklist'], keywords: ['vat dung', 'mua sam', 'noi that', 'tang', 'phong', 'shopping', 'procurement', 'checklist'] },
      { id: 'purchase-statement', labelKey: 'nav.purchaseStatement', groupKey: 'nav.groupBusinessTools', icon: FileText, path: ROUTE_OF['purchase-statement'], keywords: ['bang ke mua hang', 'hoa don', 'purchase'] },
      { id: 'retail-invoice', labelKey: 'nav.retailInvoice', groupKey: 'nav.groupBusinessTools', icon: Receipt, path: ROUTE_OF['retail-invoice'], keywords: ['hoa don ban le', 'ban le', 'invoice'] },
      { id: 'rate-quote', labelKey: 'nav.rateQuote', groupKey: 'nav.groupBusinessTools', icon: Percent, path: ROUTE_OF['rate-quote'], keywords: ['dinh gia lai suat', 'lai suat', 'quote'] },
      { id: 'cof', labelKey: 'nav.cof', groupKey: 'nav.groupBusinessTools', icon: Landmark, path: ROUTE_OF.cof, keywords: ['gia von', 'cof', 'cost of funds'] },
    ],
  },
  {
    groupKey: 'nav.groupLookup',
    items: [
      { id: 'mdsdv', labelKey: 'nav.mdsdv', groupKey: 'nav.groupLookup', icon: Target, path: ROUTE_OF.mdsdv, keywords: ['muc dich su dung von', 'mdsdv'] },
      { id: 'card-policies', labelKey: 'nav.cardPolicies', groupKey: 'nav.groupLookup', icon: BookOpen, path: ROUTE_OF['card-policies'], keywords: ['chinh sach the', 'quy dinh', 'policy'] },
      { id: 'templates', labelKey: 'nav.templates', groupKey: 'nav.groupLookup', icon: FileSignature, path: ROUTE_OF.templates, keywords: ['bieu mau', 'chung tu', 'template'] },
      { id: 'quiz-bank', labelKey: 'nav.quizBank', groupKey: 'nav.groupLookup', icon: GraduationCap, path: ROUTE_OF['quiz-bank'], keywords: ['ngan hang cau hoi', 'quiz', 'on tap'] },
    ],
  },
  {
    groupKey: 'nav.groupControl',
    items: [
      { id: 'post-loan', labelKey: 'nav.postLoan', groupKey: 'nav.groupControl', icon: ShieldAlert, path: ROUTE_OF['post-loan'], keywords: ['kiem soat sau vay', 'kssv', 'post loan', 'kiem tra'] },
      { id: 'settings', labelKey: 'nav.settings', groupKey: 'nav.groupControl', icon: Settings, path: ROUTE_OF.settings, keywords: ['cai dat', 'he thong', 'settings', 'config'] },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);
