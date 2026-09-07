import { Home } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import { monthsBetweenLabel } from '../../../../hooks/useDocumentTemplateController';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface LeaseHouseSpecific {
  location: string; floors: string; landArea: string; houseArea: string; handoverDate: string; paymentDay: string;
  monthlyPrice: string; depositAmount: string;
}

export function leaseHouseToLegacyParams(common: DossierCommon, s: LeaseHouseSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    mbContractDate: common.contractDate,
    mbLocation: s.location,
    mbPartyAName: common.partyA.name, mbPartyACccd: common.partyA.cccd,
    mbPartyACccdDate: common.partyA.cccdDate, mbPartyAAddress: common.partyA.address,
    mbPartyBName: common.partyB.name, mbPartyBCccd: common.partyB.cccd,
    mbPartyBCccdDate: common.partyB.cccdDate, mbPartyBAddress: common.partyB.address,
    lhFloors: s.floors, lhLandArea: s.landArea, lhHouseArea: s.houseArea,
    lhHandoverDate: s.handoverDate, lhPaymentDay: s.paymentDay,
    mbMonthlyPrice: s.monthlyPrice, mbDepositAmount: s.depositAmount,
    lhTermLabel: monthsBetweenLabel(common.startDate, common.endDate),
  };
}

export const leaseHouseTemplate: DocTemplate<LeaseHouseSpecific> = {
  id: 'lease_house',
  label: 'HĐ Thuê Nhà Ở',
  icon: Home,
  specificDefaults: { location: '', floors: '', landArea: '', houseArea: '', handoverDate: '', paymentDay: '', monthlyPrice: '', depositAmount: '' },
  buildHtml: (common, s) => buildDocumentHtml('lease_house', leaseHouseToLegacyParams(common, s)),
};
