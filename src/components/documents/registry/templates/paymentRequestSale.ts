import { CreditCard } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface PaymentSpecific {
  payMethodType: 'cash' | 'transfer';
  recipientTitle: 'Ông' | 'Bà';
  cashName: string;
  cashCccd: string;
  cashCccdDate: string;
  cashCccdPlace: string;
}

export function paymentToLegacyParams(common: DossierCommon, specific: PaymentSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    saleContractDate: common.contractDate,
    saleBuyerName: common.partyA.name,
    saleSellerName: common.partyB.name,
    saleItems: common.items,
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

export const paymentRequestSaleTemplate: DocTemplate<PaymentSpecific> = {
  id: 'payment_request_sale',
  label: 'Đề Nghị TT (Mua Bán)',
  icon: CreditCard,
  specificDefaults: {
    payMethodType: 'transfer', recipientTitle: 'Ông',
    cashName: '', cashCccd: '', cashCccdDate: '', cashCccdPlace: '',
  },
  buildHtml: (common, specific) =>
    buildDocumentHtml('payment_request_sale', paymentToLegacyParams(common, specific)),
};
