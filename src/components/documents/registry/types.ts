import type { ComponentType } from 'react';
import type { PaymentStageItem } from '../../../types/documents';

export interface Party {
  name: string; cccd: string; cccdDate: string;
  cccdPlace: string; address: string; birthYear: string;
  cif?: string;
  phone?: string;
  gender?: 'male' | 'female';
  maritalStatus?: 'married' | 'single' | 'divorced';
  currentAddress?: string;
}

export interface CardProductItem {
  id: string;
  network?: string;
  productPlan: string;
  feeIntProfile: string;
}

export interface CreditCardCommon {
  cards?: CardProductItem[];
  productPlan?: string;
  feeIntProfile?: string;
  cardLimit?: string;
  creditPolicy?: string;
  ttkdName?: string;
  saleOfficerName?: string;
  saleOfficerId?: string;
  saleOfficerEmail?: string;
  saleOfficerPhone?: string;
  saleOfficerCif?: string;
  saleSupportCif?: string;
  saleSupportName?: string;
  controllerName?: string;
  controllerEmail?: string;
  controllerPhone?: string;
  directorName?: string;
  directorEmail?: string;
  directorPhone?: string;
  docDateStr?: string;
}

export interface LineItem {
  id: string; name: string; unit: string;
  quantity: number; price: number; note?: string;
}

export interface DossierCommon {
  partyA: Party;
  partyB: Party;
  contractDate: string;
  startDate: string;
  endDate: string;
  /** Hình thức Bên A trả cho Bên B — dùng chung cho HĐ, bảng kê và đề nghị thanh toán. */
  payMethod: 'cash' | 'transfer';
  bank: { owner: string; accNo: string; name: string; branch: string };
  totalAmount: string;
  stages: PaymentStageItem[];
  items: LineItem[];
  creditCard?: CreditCardCommon;
}

export interface Attachment {
  title: string;
  filename: string;
  html: string;
}

export interface DocTemplate<S> {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  specificDefaults: S;
  standalone?: boolean;   // true = buildHtml trả tài liệu HTML hoàn chỉnh (tự style/khổ), preview & in riêng
  buildHtml: (common: DossierCommon, specific: S) => string;
  buildXlsx?: (common: DossierCommon, specific: S) => Uint8Array;
  attachments?: (common: DossierCommon, specific: S) => Attachment[];
}

export interface Dossier {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string; size?: number }>;
  commonDefaults?: Partial<DossierCommon>;
  documents: Array<{ templateId: string; optional?: boolean }>;
}

export function emptyParty(): Party {
  return { name: '', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '', cif: '' };
}

export function defaultCreditCardCommon(): CreditCardCommon {
  const defaultCards: CardProductItem[] = [
    {
      id: 'card-1',
      network: 'Visa',
      productPlan: 'MS - VISA_TIN DUNG MYSTYLE',
      feeIntProfile: 'MS_PREL2_VISA_MS 33% MIEN PHI TN 1 NAM',
    },
    {
      id: 'card-2',
      network: 'Napas',
      productPlan: 'NPC_STAND - NP TIN DUNG NOI DIA CHUAN',
      feeIntProfile: 'NPC_PRFL1_NAPAS TIN DUNG 18% THU PHI TN',
    },
    {
      id: 'card-3',
      network: 'Mastercard',
      productPlan: 'MCCR_PL - MASTERCARD CREDIT PLATINUM',
      feeIntProfile: 'MCCP_PRF05_MCCR_PL 33% MIEN PHI PH, TN 1 NAM',
    },
  ];

  return {
    cards: defaultCards,
    productPlan: defaultCards.map(c => c.productPlan).join('<br/>'),
    feeIntProfile: defaultCards.map(c => c.feeIntProfile).join('<br/>'),
    cardLimit: '30,000,000',
    creditPolicy: 'A2_KHCN_TSBD_BDS',
    ttkdName: 'TTKD NGUYỄN ẢNH THỦ',
    saleOfficerName: 'Lại Dương Công Bằng',
    saleOfficerId: '2026-03016',
    saleOfficerEmail: 'laiduongcongbang@vietbank.com.vn',
    saleOfficerPhone: '0772.750.714',
    saleOfficerCif: '005247611',
    saleSupportCif: '005218997',
    saleSupportName: 'NGUYỄN THỊ XUÂN NHƯ',
    controllerName: 'Nguyễn Thanh Tùng',
    controllerEmail: 'nguyenthanhtung@vietbank.com.vn',
    controllerPhone: '0962.764.468',
    directorName: 'Trần Đại Thời',
    directorEmail: 'trandaithoi@vietbank.com.vn',
    directorPhone: '0932.701.968',
    docDateStr: '2026',
  };
}

export function emptyCommon(): DossierCommon {
  return {
    partyA: emptyParty(),
    partyB: emptyParty(),
    contractDate: '',
    startDate: '',
    endDate: '',
    payMethod: 'transfer',
    bank: { owner: '', accNo: '', name: '', branch: '' },
    totalAmount: '',
    stages: [],
    items: [],
    creditCard: defaultCreditCardCommon(),
  };
}

/** Xưng hô theo giới tính đã chọn; chưa chọn thì đoán theo tên (có chữ "thị" là Bà). */
export function partyTitle(party: Party): 'Ông' | 'Bà' {
  if (party.gender === 'male') return 'Ông';
  if (party.gender === 'female') return 'Bà';
  return /(^|\s)thị(\s|$)/iu.test(party.name.normalize('NFC')) ? 'Bà' : 'Ông';
}
