import { CreditCard } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { partyTitle } from '../types';
import { baseDraft } from '../legacyDraft';

/**
 * Đề nghị thanh toán không còn phần riêng: hình thức, xưng hô, các đợt và người nhận tiền
 * đều lấy từ thông tin chung, nên luôn khớp với HĐ / bảng kê cùng hồ sơ.
 */
export type PaymentSpecific = Record<string, never>;

/** Phần thông tin thanh toán dùng chung cho mọi mẫu đề nghị thanh toán. */
export function paymentInfoFromCommon(common: DossierCommon): Partial<DocumentDraft> {
  return {
    payStages: common.stages,
    payMethodType: common.payMethod,
    recipientTitle: partyTitle(common.partyA),
    payCashName: common.partyB.name,
    payCashCccd: common.partyB.cccd,
    payCashCccdDate: common.partyB.cccdDate,
    payCashCccdPlace: common.partyB.cccdPlace,
    payBankOwner: common.bank.owner,
    payBankAccNo: common.bank.accNo,
    payBankName: common.bank.name,
    payBankBranch: common.bank.branch,
  };
}

export function paymentToLegacyParams(common: DossierCommon): DocumentDraft {
  return {
    ...baseDraft(),
    saleContractDate: common.contractDate,
    saleBuyerName: common.partyA.name,
    saleSellerName: common.partyB.name,
    saleItems: common.items,
    ...paymentInfoFromCommon(common),
  };
}

export const paymentRequestSaleTemplate: DocTemplate<PaymentSpecific> = {
  id: 'payment_request_sale',
  label: 'Đề Nghị TT (Mua Bán)',
  icon: CreditCard,
  specificDefaults: {},
  buildHtml: common => buildDocumentHtml('payment_request_sale', paymentToLegacyParams(common)),
};
