import { Hammer } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { monthsBetweenLabel } from '../../../../hooks/useDocumentTemplateController';
import type { ConstItem } from '../../../../types/documents';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface ConstructionSpecific {
  siteAddress: string;
  depositStage1: string;
  stage2Amount: string;
  warrantyMonths: string;
}

export function constToLegacyParams(common: DossierCommon, s: ConstructionSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    constContractDate: common.contractDate,
    constPartyAName: common.partyA.name,
    constPartyACccd: common.partyA.cccd,
    constPartyAAddress: common.partyA.address,
    constPartyBName: common.partyB.name,
    constPartyBCccd: common.partyB.cccd,
    constSiteAddress: s.siteAddress,
    constStartDate: common.startDate,
    constEndDate: common.endDate,
    constTotalPrice: common.totalAmount,
    constDepositStage1: s.depositStage1,
    constStage2Amount: s.stage2Amount,
    constWarrantyMonths: s.warrantyMonths,
    constItems: common.items as ConstItem[],
    constDurationMonths: monthsBetweenLabel(common.startDate, common.endDate),
  };
}

export const constructionTemplate: DocTemplate<ConstructionSpecific> = {
  id: 'construction',
  label: 'HĐ Thi Công Nhà Ở',
  icon: Hammer,
  specificDefaults: { siteAddress: '', depositStage1: '', stage2Amount: '', warrantyMonths: '' },
  buildHtml: (common, s) => buildDocumentHtml('construction', constToLegacyParams(common, s)),
};
