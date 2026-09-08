import type { ComponentType } from 'react';
import type { PaymentStageItem } from '../DocumentForm';

export interface Party {
  name: string; cccd: string; cccdDate: string;
  cccdPlace: string; address: string; birthYear: string;
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
  bank: { owner: string; accNo: string; name: string; branch: string };
  totalAmount: string;
  stages: PaymentStageItem[];
  items: LineItem[];
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
  return { name: '', cccd: '', cccdDate: '', cccdPlace: '', address: '', birthYear: '' };
}

export function emptyCommon(): DossierCommon {
  return {
    partyA: emptyParty(),
    partyB: emptyParty(),
    contractDate: '',
    startDate: '',
    endDate: '',
    bank: { owner: '', accNo: '', name: '', branch: '' },
    totalAmount: '',
    stages: [],
    items: [],
  };
}
