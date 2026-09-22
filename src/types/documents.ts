export type TemplateType =
  | 'lease_mb'
  | 'construction'
  | 'const_estimate'
  | 'sale_contract'
  | 'lease_house'
  | 'lease_room'
  | 'lease_warehouse'
  | 'loan_contract'
  | 'lease_land'
  | 'payment_request_sale'
  | 'payment_request_bang_ke'
  | 'payment_request_const'
  | 'deposit';

export interface SaleItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface ConstItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
}

export interface PaymentStageItem {
  id: string;
  stageName: string;
  amount: string;
  status: 'paid' | 'current' | 'future';
  note?: string;
}

export interface DepositContractData {
  buyerTitle: string;
  buyerName: string;
  buyerBirthYear: string;
  buyerCccd: string;
  buyerCccdDate: string;
  buyerCccdPlace: string;
  buyerAddress: string;

  sellerTitle: string;
  sellerName: string;
  sellerBirthYear: string;
  sellerCccd: string;
  sellerCccdDate: string;
  sellerCccdPlace: string;
  sellerAddress: string;

  parcelNo: string;
  mapSheetNo: string;
  area: string;
  areaInWords: string;
  parcelAddress: string;
  urbanResidentialArea: string;
  perennialCropArea: string;
  certificateNo: string;
  certificateBookNo: string;
  certificateIssuer: string;
  certificateDate: string;

  transferPrice: string;
  deposit1: string;
  payment2: string;
  incomeTaxBy: string;
  registrationTaxBy: string;

  signPlace: string;
  signDate: string;
}
