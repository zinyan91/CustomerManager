import type { DocTemplate } from '../types';
import { saleContractTemplate } from './saleContract';
import { paymentRequestSaleTemplate } from './paymentRequestSale';
import { camKetTemplate } from './camKet';

export const TEMPLATE_BY_ID: Record<string, DocTemplate<any>> = {
  [saleContractTemplate.id]: saleContractTemplate,
  [paymentRequestSaleTemplate.id]: paymentRequestSaleTemplate,
  [camKetTemplate.id]: camKetTemplate,
};
