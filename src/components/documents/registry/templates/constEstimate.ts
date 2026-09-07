import { Calculator } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { ConstItem } from '../../DocumentForm';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface EstimateSpecific { siteAddress: string; }

export function estimateToLegacyParams(common: DossierCommon, s: EstimateSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    constContractDate: common.contractDate,
    constPartyAName: common.partyA.name,
    constPartyBName: common.partyB.name,
    constPartyBCccd: common.partyB.cccd,
    constSiteAddress: s.siteAddress,
    constTotalPrice: common.totalAmount,
    constItems: common.items as ConstItem[],
  };
}

export const constEstimateTemplate: DocTemplate<EstimateSpecific> = {
  id: 'const_estimate',
  label: 'Dự Toán Thi Công',
  icon: Calculator,
  specificDefaults: { siteAddress: '' },
  buildHtml: (common, s) => buildDocumentHtml('const_estimate', estimateToLegacyParams(common, s)),
};
