import { CreditCard } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { paymentInfoFromCommon, type PaymentSpecific } from './paymentRequestSale';
import { baseDraft } from '../legacyDraft';

export function paymentBangKeToLegacyParams(common: DossierCommon): DocumentDraft {
  return {
    ...baseDraft(),
    saleContractDate: common.contractDate,
    saleBuyerName: common.partyA.name,
    saleSellerName: common.partyB.name,
    saleItems: common.items,
    constTotalPrice: common.totalAmount,
    ...paymentInfoFromCommon(common),
  };
}

export const paymentRequestBangKeTemplate: DocTemplate<PaymentSpecific> = {
  id: 'payment_request_bang_ke',
  label: 'Đề Nghị TT (Bảng Kê)',
  icon: CreditCard,
  specificDefaults: {},
  buildHtml: common =>
    buildDocumentHtml('payment_request_bang_ke' as any, paymentBangKeToLegacyParams(common)),
};
