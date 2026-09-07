import { CreditCard } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import type { PaymentSpecific } from './paymentRequestSale';
import { baseDraft } from '../legacyDraft';

export function paymentConstToLegacyParams(common: DossierCommon, s: PaymentSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    constContractDate: common.contractDate,
    constPartyAName: common.partyA.name,
    constPartyBName: common.partyB.name,
    constPartyBCccd: common.partyB.cccd,
    constTotalPrice: common.totalAmount,
    payStages: common.stages,
    payMethodType: s.payMethodType,
    recipientTitle: s.recipientTitle,
    payCashName: s.cashName,
    payCashCccd: s.cashCccd,
    payCashCccdDate: s.cashCccdDate,
    payCashCccdPlace: s.cashCccdPlace,
    payBankOwner: common.bank.owner,
    payBankAccNo: common.bank.accNo,
    payBankName: common.bank.name,
    payBankBranch: common.bank.branch,
  };
}

export const paymentRequestConstTemplate: DocTemplate<PaymentSpecific> = {
  id: 'payment_request_const',
  label: 'Đề Nghị TT (Thi Công)',
  icon: CreditCard,
  specificDefaults: {
    payMethodType: 'transfer', recipientTitle: 'Ông',
    cashName: '', cashCccd: '', cashCccdDate: '', cashCccdPlace: '',
  },
  buildHtml: (common, s) => buildDocumentHtml('payment_request_const', paymentConstToLegacyParams(common, s)),
};
