import React from 'react';
import type { DepositContractData } from './depositContract';
import type { UiClasses } from '../../lib/uiClasses';
import type { TemplateType } from './TemplateSelector';
import { DepositForm } from './forms/DepositForm';
import { LeaseForm } from './forms/LeaseForm';
import { ConstructionForm } from './forms/ConstructionForm';
import { EstimateForm } from './forms/EstimateForm';
import { SaleForm } from './forms/SaleForm';
import { PaymentRequestForm } from './forms/PaymentRequestForm';

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

export interface DocumentFormProps {
  styles: UiClasses;
  selectedTemplate: TemplateType;

  mbContractDate: string; setMbContractDate: (v: string) => void;
  mbPartyAName: string; setMbPartyAName: (v: string) => void;
  mbPartyACccd: string; setMbPartyACccd: (v: string) => void;
  mbPartyACccdDate: string; setMbPartyACccdDate: (v: string) => void;
  mbPartyAAddress: string; setMbPartyAAddress: (v: string) => void;
  mbPartyBName: string; setMbPartyBName: (v: string) => void;
  mbPartyBCccd: string; setMbPartyBCccd: (v: string) => void;
  mbPartyBCccdDate: string; setMbPartyBCccdDate: (v: string) => void;
  mbPartyBAddress: string; setMbPartyBAddress: (v: string) => void;
  mbLocation: string; setMbLocation: (v: string) => void;
  mbStartDate: string; setMbStartDate: (v: string) => void;
  mbEndDate: string; setMbEndDate: (v: string) => void;
  mbMonthlyPrice: string; setMbMonthlyPrice: (v: string) => void;
  mbDepositAmount: string; setMbDepositAmount: (v: string) => void;
  lhFloors: string; setLhFloors: (v: string) => void;
  lhLandArea: string; setLhLandArea: (v: string) => void;
  lhHouseArea: string; setLhHouseArea: (v: string) => void;
  lhHandoverDate: string; setLhHandoverDate: (v: string) => void;
  lhPaymentDay: string; setLhPaymentDay: (v: string) => void;

  constContractDate: string; setConstContractDate: (v: string) => void;
  constPartyAName: string; setConstPartyAName: (v: string) => void;
  constPartyACccd: string; setConstPartyACccd: (v: string) => void;
  constPartyAAddress: string; setConstPartyAAddress: (v: string) => void;
  constPartyBName: string; setConstPartyBName: (v: string) => void;
  constPartyBCccd: string; setConstPartyBCccd: (v: string) => void;
  constSiteAddress: string; setConstSiteAddress: (v: string) => void;
  constStartDate: string; setConstStartDate: (v: string) => void;
  constEndDate: string; setConstEndDate: (v: string) => void;
  constTotalPrice: string; setConstTotalPrice: (v: string) => void;
  constDepositStage1: string; setConstDepositStage1: (v: string) => void;
  constStage2Amount: string; setConstStage2Amount: (v: string) => void;
  constWarrantyMonths: string; setConstWarrantyMonths: (v: string) => void;
  constItems: ConstItem[]; setConstItems: React.Dispatch<React.SetStateAction<ConstItem[]>>;
  handleAddConstItem: () => void;

  saleContractDate: string; setSaleContractDate: (v: string) => void;
  saleBuyerName: string; setSaleBuyerName: (v: string) => void;
  saleBuyerAddress: string; setSaleBuyerAddress: (v: string) => void;
  saleSellerName: string; setSaleSellerName: (v: string) => void;
  saleSellerCccd: string; setSaleSellerCccd: (v: string) => void;
  saleSellerCccdDate: string; setSaleSellerCccdDate: (v: string) => void;
  saleSellerCccdPlace: string; setSaleSellerCccdPlace: (v: string) => void;
  salePayMethod: 'cash' | 'transfer'; setSalePayMethod: (v: 'cash' | 'transfer') => void;
  saleBankOwner: string; setSaleBankOwner: (v: string) => void;
  saleBankAccNo: string; setSaleBankAccNo: (v: string) => void;
  saleBankName: string; setSaleBankName: (v: string) => void;
  saleBankBranch: string; setSaleBankBranch: (v: string) => void;
  saleStartDate: string; setSaleStartDate: (v: string) => void;
  saleEndDate: string; setSaleEndDate: (v: string) => void;
  salePaymentStage1: string; setSalePaymentStage1: (v: string) => void;
  saleItems: SaleItem[]; setSaleItems: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  handleAddSaleItem: () => void;
  catalogs?: import('../../lib/saleCatalogStore').SaleCatalogProfile[];
  currentCatalogId?: string;
  onSelectCatalogId?: (id: string) => void;
  onOpenCatalogModal?: () => void;

  payMethodType?: 'cash' | 'transfer';
  setPayMethodType?: (v: 'cash' | 'transfer') => void;
  payCashName?: string; setPayCashName?: (v: string) => void;
  payCashCccd?: string; setPayCashCccd?: (v: string) => void;
  payCashCccdDate?: string; setPayCashCccdDate?: (v: string) => void;
  payCashCccdPlace?: string; setPayCashCccdPlace?: (v: string) => void;
  payBankOwner?: string; setPayBankOwner?: (v: string) => void;
  payBankAccNo?: string; setPayBankAccNo?: (v: string) => void;
  payBankName?: string; setPayBankName?: (v: string) => void;
  payBankBranch?: string; setPayBankBranch?: (v: string) => void;
  deposit: DepositContractData;
  setDeposit: React.Dispatch<React.SetStateAction<DepositContractData>>;

  payStages?: PaymentStageItem[];
  setPayStages?: React.Dispatch<React.SetStateAction<PaymentStageItem[]>>;
  handleAddPayStage?: () => void;
}

export const DocumentForm: React.FC<DocumentFormProps> = (props) => {
  switch (props.selectedTemplate) {
    case 'deposit':
      return <DepositForm {...props} />;
    case 'lease_mb':
    case 'lease_house':
      return <LeaseForm {...props} />;
    case 'construction':
      return <ConstructionForm {...props} />;
    case 'const_estimate':
      return <EstimateForm {...props} />;
    case 'sale_contract':
      return <SaleForm {...props} />;
    case 'payment_request_sale':
    case 'payment_request_const':
      return <PaymentRequestForm {...props} />;
    default:
      return null;
  }
};
