import { ShoppingCart } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

/** HĐ mua bán không còn phần riêng: hình thức và đợt 1 lấy từ thông tin chung của hồ sơ. */
export type SaleSpecific = Record<string, never>;

export function saleToLegacyParams(common: DossierCommon): DocumentDraft {
  return {
    ...baseDraft(),
    saleContractDate: common.contractDate,
    saleBuyerName: common.partyA.name,
    saleBuyerAddress: common.partyA.address,
    saleSellerName: common.partyB.name,
    saleSellerCccd: common.partyB.cccd,
    saleSellerCccdDate: common.partyB.cccdDate,
    saleSellerCccdPlace: common.partyB.cccdPlace,
    salePayMethod: common.payMethod,
    saleBankOwner: common.bank.owner,
    saleBankAccNo: common.bank.accNo,
    saleBankName: common.bank.name,
    saleBankBranch: common.bank.branch,
    // Hàng giao ngay khi ký: thời hạn tính từ ngày ký, ô ngày bắt đầu không còn trên form.
    saleStartDate: common.contractDate,
    saleEndDate: common.endDate,
    salePaymentStage1: common.stages[0]?.amount ?? '',
    saleItems: common.items,
  };
}

export const saleContractTemplate: DocTemplate<SaleSpecific> = {
  id: 'sale_contract',
  label: 'HĐ Mua Bán Hàng Hóa',
  icon: ShoppingCart,
  specificDefaults: {},
  buildHtml: common => buildDocumentHtml('sale_contract', saleToLegacyParams(common)),
};
