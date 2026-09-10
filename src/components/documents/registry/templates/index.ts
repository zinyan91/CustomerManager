import type { DocTemplate } from '../types';
import { saleContractTemplate } from './saleContract';
import { paymentRequestSaleTemplate } from './paymentRequestSale';
import { paymentRequestBangKeTemplate } from './paymentRequestBangKe';
import { camKetTemplate } from './camKet';
import { constructionTemplate } from './construction';
import { paymentRequestConstTemplate } from './paymentRequestConst';
import { bangKeTemplate } from './bangKe';
import { leaseMbTemplate } from './leaseMb';
import { leaseHouseTemplate } from './leaseHouse';
import { constEstimateTemplate } from './constEstimate';
import { depositTemplate } from './deposit';

export const TEMPLATE_BY_ID: Record<string, DocTemplate<any>> = {
  [saleContractTemplate.id]: saleContractTemplate,
  [paymentRequestSaleTemplate.id]: paymentRequestSaleTemplate,
  [paymentRequestBangKeTemplate.id]: paymentRequestBangKeTemplate,
  [camKetTemplate.id]: camKetTemplate,
  [constructionTemplate.id]: constructionTemplate,
  [paymentRequestConstTemplate.id]: paymentRequestConstTemplate,
  [bangKeTemplate.id]: bangKeTemplate,
  [leaseMbTemplate.id]: leaseMbTemplate,
  [leaseHouseTemplate.id]: leaseHouseTemplate,
  [constEstimateTemplate.id]: constEstimateTemplate,
  [depositTemplate.id]: depositTemplate,
};

