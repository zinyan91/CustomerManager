import { Building2 } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface LeaseMbSpecific { location: string; monthlyPrice: string; depositAmount: string; }

export function leaseMbToLegacyParams(common: DossierCommon, s: LeaseMbSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    mbContractDate: common.contractDate,
    mbLocation: s.location,
    mbPartyAName: common.partyA.name, mbPartyACccd: common.partyA.cccd,
    mbPartyACccdDate: common.partyA.cccdDate, mbPartyAAddress: common.partyA.address,
    mbPartyBName: common.partyB.name, mbPartyBCccd: common.partyB.cccd,
    mbPartyBCccdDate: common.partyB.cccdDate, mbPartyBAddress: common.partyB.address,
    mbStartDate: common.startDate, mbEndDate: common.endDate,
    mbMonthlyPrice: s.monthlyPrice, mbDepositAmount: s.depositAmount,
  };
}

export const leaseMbTemplate: DocTemplate<LeaseMbSpecific> = {
  id: 'lease_mb',
  label: 'HĐ Thuê Mặt Bằng',
  icon: Building2,
  specificDefaults: { location: '', monthlyPrice: '', depositAmount: '' },
  buildHtml: (common, s) => buildDocumentHtml('lease_mb', leaseMbToLegacyParams(common, s)),
};
