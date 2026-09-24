import { CreditCard } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { paymentInfoFromCommon, type PaymentSpecific } from './paymentRequestSale';
import { baseDraft } from '../legacyDraft';

export function paymentConstToLegacyParams(common: DossierCommon): DocumentDraft {
  return {
    ...baseDraft(),
    constContractDate: common.contractDate,
    constPartyAName: common.partyA.name,
    constPartyBName: common.partyB.name,
    constPartyBCccd: common.partyB.cccd,
    constTotalPrice: common.totalAmount,
    ...paymentInfoFromCommon(common),
  };
}

export const paymentRequestConstTemplate: DocTemplate<PaymentSpecific> = {
  id: 'payment_request_const',
  label: 'Đề Nghị TT (Thi Công)',
  icon: CreditCard,
  specificDefaults: {},
  buildHtml: common => buildDocumentHtml('payment_request_const', paymentConstToLegacyParams(common)),
};
