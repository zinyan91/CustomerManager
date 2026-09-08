import type { FC } from 'react';
import { SaleSpecificForm } from './SaleSpecificForm';
import { PaymentSpecificForm } from './PaymentSpecificForm';
import { ConstructionSpecificForm } from './ConstructionSpecificForm';
import { LeaseMbSpecificForm } from './LeaseMbSpecificForm';
import { LeaseHouseSpecificForm } from './LeaseHouseSpecificForm';
import { EstimateSpecificForm } from './EstimateSpecificForm';
import { BangKeSpecificForm } from './BangKeSpecificForm';

export const SPECIFIC_FORM_BY_ID: Record<string, FC<any> | null> = {
  sale_contract: SaleSpecificForm,
  payment_request_sale: PaymentSpecificForm,
  construction: ConstructionSpecificForm,
  payment_request_const: PaymentSpecificForm,
  cam_ket: null,
  bang_ke: BangKeSpecificForm,
  lease_mb: LeaseMbSpecificForm,
  lease_house: LeaseHouseSpecificForm,
  const_estimate: EstimateSpecificForm,
};
