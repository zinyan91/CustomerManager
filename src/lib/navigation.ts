import type { ElementType } from 'react';
import {
  LayoutDashboard, Landmark,
  Users, FileText, Building2, CreditCard,
  ShieldAlert, Settings, Calculator, Percent,
  Handshake, ClipboardList, Boxes, FileSignature, FolderArchive, Database,
} from 'lucide-react';
import type { TranslationKey } from './i18n';
import { ROUTE_OF } from './routes';

export type ScreenId =
  | 'dashboard' | 'hub'
  | 'customers' | 'disbursement' | 'credit-contracts' | 'loans' | 'collaterals' | 'mortgage-contracts' | 'credit-cards' | 'dispatches' | 'storage'
  | 'calculators' | 'business-plan' | 'corporate-financial' | 'inventory' | 'shopping-checklist' | 'purchase-statement'
  | 'retail-invoice' | 'rate-quote' | 'cof' | 'reports'
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
      { id: 'dashboard', labelKey: 'nav.dashboard', groupKey: 'nav.groupOverview', icon: LayoutDashboard, path: ROUTE_OF.dashboard, keywords: ['tong quan', 'dashboard', 'thong ke'] },
      { id: 'hub', labelKey: 'nav.hub', groupKey: 'nav.groupOverview', icon: Landmark, path: ROUTE_OF.hub, keywords: ['danh muc', 'hub', 'nghiep vu', 'tra cuu', 'bieu mau'] },
    ],
  },
  {
    groupKey: 'nav.groupRecords',
    items: [
      { id: 'customers', labelKey: 'nav.customers', groupKey: 'nav.groupRecords', icon: Users, path: ROUTE_OF.customers, keywords: ['khach hang', 'danh sach', 'customer', 'cif'] },
      { id: 'credit-contracts', labelKey: 'nav.creditContracts', groupKey: 'nav.groupRecords', icon: Handshake, path: ROUTE_OF['credit-contracts'], keywords: ['hop dong tin dung', 'hdtd', 'tin dung', 'contract'] },
      { id: 'loans', labelKey: 'nav.loans', groupKey: 'nav.groupRecords', icon: FileText, path: ROUTE_OF.loans, keywords: ['khoan vay', 'du no', 'loan', 'portfolio'] },
      { id: 'collaterals', labelKey: 'nav.collaterals', groupKey: 'nav.groupRecords', icon: Building2, path: ROUTE_OF.collaterals, keywords: ['tai san bao dam', 'tsbd', 'collateral', 'bat dong san'] },
      { id: 'mortgage-contracts', labelKey: 'nav.mortgageContracts', groupKey: 'nav.groupRecords', icon: FileSignature, path: ROUTE_OF['mortgage-contracts'], keywords: ['hop dong the chap', 'hdtc', 'the chap', 'mortgage'] },
      { id: 'credit-cards', labelKey: 'nav.creditCards', groupKey: 'nav.groupRecords', icon: CreditCard, path: ROUTE_OF['credit-cards'], keywords: ['the tin dung', 'card', 'han muc'] },
      { id: 'dispatches', labelKey: 'nav.dispatches', groupKey: 'nav.groupRecords', icon: FolderArchive, path: ROUTE_OF.dispatches, keywords: ['van thu', 'tai lieu', 'ho so', 'dispatch', 'cong van'] },
      { id: 'storage', labelKey: 'nav.storage', groupKey: 'nav.groupRecords', icon: Database, path: ROUTE_OF.storage, keywords: ['kho luu tru', 'file ca nhan', 'huggingface', 'dataset', 'drive'] },
    ],
  },
  {
    groupKey: 'nav.groupCorporate',
    items: [
      { id: 'business-plan', labelKey: 'nav.businessPlan', groupKey: 'nav.groupCorporate', icon: ClipboardList, path: ROUTE_OF['business-plan'], keywords: ['phuong an kinh doanh', 'pakd', 'phuong an'] },
      { id: 'inventory', labelKey: 'nav.inventory', groupKey: 'nav.groupCorporate', icon: Boxes, path: ROUTE_OF.inventory, keywords: ['ton kho', 'hang hoa', 'inventory'] },
    ],
  },
  {
    groupKey: 'nav.groupFinancialTools',
    items: [
      { id: 'calculators', labelKey: 'nav.calculators', groupKey: 'nav.groupFinancialTools', icon: Calculator, path: ROUTE_OF.calculators, keywords: ['tinh toan', 'lai suat', 'calculator', 'tra no'] },
      { id: 'rate-quote', labelKey: 'nav.rateQuote', groupKey: 'nav.groupFinancialTools', icon: Percent, path: ROUTE_OF['rate-quote'], keywords: ['dinh gia lai suat', 'lai suat', 'quote'] },
    ],
  },
  {
    groupKey: 'nav.groupLookupControl',
    items: [
      { id: 'post-loan', labelKey: 'nav.postLoan', groupKey: 'nav.groupLookupControl', icon: ShieldAlert, path: ROUTE_OF['post-loan'], keywords: ['kiem soat sau vay', 'kssv', 'post loan', 'kiem tra'] },
      { id: 'settings', labelKey: 'nav.settings', groupKey: 'nav.groupLookupControl', icon: Settings, path: ROUTE_OF.settings, keywords: ['cai dat', 'he thong', 'settings', 'config'] },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);
