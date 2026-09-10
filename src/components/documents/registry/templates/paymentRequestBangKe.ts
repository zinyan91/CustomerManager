import { CreditCard } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import type { PaymentSpecific } from './paymentRequestSale';
import { baseDraft } from '../legacyDraft';

export function paymentBangKeToLegacyParams(common: DossierCommon, specific: PaymentSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    saleContractDate: common.contractDate,
    saleBuyerName: common.partyA.name,
    saleSellerName: common.partyB.name,
    saleItems: common.items,
    constTotalPrice: common.totalAmount,
    payStages: common.stages,
    payMethodType: specific.payMethodType,
    recipientTitle: specific.recipientTitle,
    payCashName: specific.cashName,
    payCashCccd: specific.cashCccd,
    payCashCccdDate: specific.cashCccdDate,
    payCashCccdPlace: specific.cashCccdPlace,
    payBankOwner: common.bank.owner,
    payBankAccNo: common.bank.accNo,
    payBankName: common.bank.name,
    payBankBranch: common.bank.branch,
  };
}

export const paymentRequestBangKeTemplate: DocTemplate<PaymentSpecific> = {
  id: 'payment_request_bang_ke',
  label: 'Đề Nghị TT (Bảng Kê)',
  icon: CreditCard,
  specificDefaults: {
    payMethodType: 'transfer',
    recipientTitle: 'Ông',
    cashName: '',
    cashCccd: '',
    cashCccdDate: '',
    cashCccdPlace: '',
  },
  buildHtml: (common, specific) =>
    buildDocumentHtml('payment_request_bang_ke' as any, paymentBangKeToLegacyParams(common, specific)),
};
