import { ShoppingCart } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface SaleSpecific {
  payMethod: 'cash' | 'transfer';
  paymentStage1: string;
}

export function saleToLegacyParams(common: DossierCommon, specific: SaleSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    saleContractDate: common.contractDate,
    saleBuyerName: common.partyA.name,
    saleBuyerAddress: common.partyA.address,
    saleSellerName: common.partyB.name,
    saleSellerCccd: common.partyB.cccd,
    saleSellerCccdDate: common.partyB.cccdDate,
    saleSellerCccdPlace: common.partyB.cccdPlace,
    salePayMethod: specific.payMethod,
    saleBankOwner: common.bank.owner,
    saleBankAccNo: common.bank.accNo,
    saleBankName: common.bank.name,
    saleBankBranch: common.bank.branch,
    saleStartDate: common.startDate,
    saleEndDate: common.endDate,
    salePaymentStage1: specific.paymentStage1,
    saleItems: common.items,
  };
}

export const saleContractTemplate: DocTemplate<SaleSpecific> = {
  id: 'sale_contract',
  label: 'HĐ Mua Bán Hàng Hóa',
  icon: ShoppingCart,
  specificDefaults: { payMethod: 'cash', paymentStage1: '' },
  buildHtml: (common, specific) =>
    buildDocumentHtml('sale_contract', saleToLegacyParams(common, specific)),
};
