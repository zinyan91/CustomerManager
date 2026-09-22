import { Calculator } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import {
  buildEstimateDocHtml,
  buildEstimateXlsx,
  ESTIMATE_PRESETS,
  type EstimateItem,
} from '../../../../lib/estimateExport';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import type { ConstItem } from '../../DocumentForm';
import { baseDraft } from '../legacyDraft';

export interface EstimateSpecific {
  siteAddress?: string;
  sheetTitle?: string;
  loanAmount?: number;
  unitPrice?: number;
  creatorTitle?: string;
  creatorName?: string;
  orientation?: 'landscape' | 'portrait';
}

export const defaultEstimateSpecific: EstimateSpecific = {
  siteAddress: '',
  sheetTitle: 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT',
  loanAmount: 960000000,
  unitPrice: 6000000,
  creatorTitle: 'Người lập',
  creatorName: '',
  orientation: 'landscape',
};

function parseNum(val: unknown): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = String(val).replace(/[^\d.-]/g, '');
  return Number(s) || 0;
}

export function estimateToLegacyParams(common: DossierCommon, s: EstimateSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    constContractDate: common.contractDate,
    constPartyAName: common.partyA.name,
    constPartyBName: common.partyB.name,
    constPartyBCccd: common.partyB.cccd,
    constSiteAddress: s.siteAddress || '',
    constTotalPrice: common.totalAmount,
    constItems: (common.items || []) as ConstItem[],
  };
}

function resolveItems(common: DossierCommon): EstimateItem[] {
  const raw = common?.items && common.items.length > 0
    ? common.items
    : ESTIMATE_PRESETS.sua_chua_nha.items;
  return raw.map((it: any, idx: number) => ({
    id: String(it.id || idx + 1),
    name: it.name || '',
    unit: it.unit || 'm²',
    quantity: Number(it.quantity) || 0,
    price: Number(it.price) || 0,
    note: it.note || '',
  }));
}

export const constEstimateTemplate: DocTemplate<EstimateSpecific> = {
  id: 'const_estimate',
  label: 'Dự Toán Thi Công',
  icon: Calculator,
  specificDefaults: defaultEstimateSpecific,
  standalone: true,
  buildHtml: (common: DossierCommon, s: EstimateSpecific = defaultEstimateSpecific) => {
    const items = resolveItems(common);
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const loanAmount = s.loanAmount !== undefined && s.loanAmount > 0
      ? s.loanAmount
      : (common?.totalAmount ? parseNum(common.totalAmount) : Math.round(total * 0.8));

    return buildEstimateDocHtml({
      sheetTitle: s.sheetTitle || 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT',
      items,
      loanAmount,
      unitPrice: s.unitPrice,
      creatorTitle: s.creatorTitle || 'Người lập',
      creatorName: s.creatorName || common?.partyA?.name || '',
      siteAddress: s.siteAddress,
      contractDate: common?.contractDate,
      partyAName: common?.partyA?.name,
      partyBName: common?.partyB?.name,
      orientation: s.orientation || 'landscape',
    });
  },
  buildXlsx: (common: DossierCommon, s: EstimateSpecific = defaultEstimateSpecific) => {
    const items = resolveItems(common);
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const loanAmount = s.loanAmount !== undefined && s.loanAmount > 0
      ? s.loanAmount
      : (common?.totalAmount ? parseNum(common.totalAmount) : Math.round(total * 0.8));

    return buildEstimateXlsx({
      sheetTitle: s.sheetTitle || 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT',
      items,
      loanAmount,
      unitPrice: s.unitPrice,
      creatorTitle: s.creatorTitle || 'Người lập',
      creatorName: s.creatorName || common?.partyA?.name || '',
      siteAddress: s.siteAddress,
      contractDate: common?.contractDate,
      partyAName: common?.partyA?.name,
      partyBName: common?.partyB?.name,
    });
  },
};
