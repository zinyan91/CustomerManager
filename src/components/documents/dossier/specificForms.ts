import type { FC } from 'react';
import { SaleSpecificForm } from './SaleSpecificForm';
import { PaymentSpecificForm } from './PaymentSpecificForm';

export const SPECIFIC_FORM_BY_ID: Record<string, FC<any> | null> = {
  sale_contract: SaleSpecificForm,
  payment_request_sale: PaymentSpecificForm,
  cam_ket: null,
};
