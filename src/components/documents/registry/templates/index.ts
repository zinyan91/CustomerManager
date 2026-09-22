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
import { leaseRoomTemplate } from './leaseRoom';
import { constEstimateTemplate } from './constEstimate';
import { depositTemplate } from './deposit';
import { bm01DeNghiGiaiNganTemplate } from './bm01DeNghiGiaiNgan';
import { bm02ToTrinhGiaiNganTemplate } from './bm02ToTrinhGiaiNgan';
import { bm07BienBanBanGiaoTemplate } from './bm07BienBanBanGiao';
import { bm09DanhMucHoSoTemplate } from './bm09DanhMucHoSo';
import { bm11TraNoTruocHanTemplate } from './bm11TraNoTruocHan';

import { leaseWarehouseTemplate } from './leaseWarehouse';
import { loanContractTemplate } from './loanContract';
import { leaseLandTemplate } from './leaseLand';

import { ccDanhMucTemplate } from './ccDanhMuc';
import { ccToTrinhTemplate } from './ccToTrinh';
import { ccPhieuYeuCauTemplate } from './ccPhieuYeuCau';
import { ccHuongDanTemplate } from './ccHuongDan';

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
  [leaseRoomTemplate.id]: leaseRoomTemplate,
  [leaseWarehouseTemplate.id]: leaseWarehouseTemplate,
  [loanContractTemplate.id]: loanContractTemplate,
  [leaseLandTemplate.id]: leaseLandTemplate,
  [constEstimateTemplate.id]: constEstimateTemplate,
  [depositTemplate.id]: depositTemplate,
  [bm01DeNghiGiaiNganTemplate.id]: bm01DeNghiGiaiNganTemplate,
  [bm02ToTrinhGiaiNganTemplate.id]: bm02ToTrinhGiaiNganTemplate,
  [bm07BienBanBanGiaoTemplate.id]: bm07BienBanBanGiaoTemplate,
  [bm09DanhMucHoSoTemplate.id]: bm09DanhMucHoSoTemplate,
  [bm11TraNoTruocHanTemplate.id]: bm11TraNoTruocHanTemplate,
  [ccDanhMucTemplate.id]: ccDanhMucTemplate,
  [ccToTrinhTemplate.id]: ccToTrinhTemplate,
  [ccPhieuYeuCauTemplate.id]: ccPhieuYeuCauTemplate,
  [ccHuongDanTemplate.id]: ccHuongDanTemplate,
};
