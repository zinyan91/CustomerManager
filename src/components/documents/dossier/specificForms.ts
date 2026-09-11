import type { FC } from 'react';
import { SaleSpecificForm } from './SaleSpecificForm';
import { PaymentSpecificForm } from './PaymentSpecificForm';
import { ConstructionSpecificForm } from './ConstructionSpecificForm';
import { LeaseMbSpecificForm } from './LeaseMbSpecificForm';
import { LeaseHouseSpecificForm } from './LeaseHouseSpecificForm';
import { LeaseRoomSpecificForm } from './LeaseRoomSpecificForm';
import { LeaseWarehouseSpecificForm } from './LeaseWarehouseSpecificForm';
import { LoanContractSpecificForm } from './LoanContractSpecificForm';
import { LeaseLandSpecificForm } from './LeaseLandSpecificForm';
import { EstimateSpecificForm } from './EstimateSpecificForm';
import { BangKeSpecificForm } from './BangKeSpecificForm';
import { DepositSpecificForm } from './DepositSpecificForm';
import { Bm01SpecificForm } from './Bm01SpecificForm';
import { Bm02SpecificForm } from './Bm02SpecificForm';
import { Bm07SpecificForm } from './Bm07SpecificForm';
import { Bm09SpecificForm } from './Bm09SpecificForm';
import { Bm11SpecificForm } from './Bm11SpecificForm';

export const SPECIFIC_FORM_BY_ID: Record<string, FC<any> | null> = {
  sale_contract: SaleSpecificForm,
  payment_request_sale: PaymentSpecificForm,
  construction: ConstructionSpecificForm,
  payment_request_const: PaymentSpecificForm,
  cam_ket: null,
  bang_ke: BangKeSpecificForm,
  payment_request_bang_ke: PaymentSpecificForm,
  lease_mb: LeaseMbSpecificForm,
  lease_house: LeaseHouseSpecificForm,
  lease_room: LeaseRoomSpecificForm,
  lease_warehouse: LeaseWarehouseSpecificForm,
  loan_contract: LoanContractSpecificForm,
  lease_land: LeaseLandSpecificForm,
  const_estimate: EstimateSpecificForm,
  deposit: DepositSpecificForm,
  bm01_de_nghi_giai_ngan: Bm01SpecificForm,
  bm02_to_trinh_giai_ngan: Bm02SpecificForm,
  bm07_bien_ban_ban_giao: Bm07SpecificForm,
  bm09_danh_muc_ho_so: Bm09SpecificForm,
  bm11_tra_no_truoc_han: Bm11SpecificForm,
};
