import type { FC } from 'react';
import { SaleSpecificForm } from './SaleSpecificForm';
import { PaymentSpecificForm } from './PaymentSpecificForm';
import { ConstructionSpecificForm } from './ConstructionSpecificForm';

export const SPECIFIC_FORM_BY_ID: Record<string, FC<any> | null> = {
  sale_contract: SaleSpecificForm,
  payment_request_sale: PaymentSpecificForm,
  construction: ConstructionSpecificForm,
  payment_request_const: PaymentSpecificForm,
  cam_ket: null,
};
