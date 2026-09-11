import { Coins } from 'lucide-react';
import { buildLoanContractHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';

export interface LoanContractSpecific {
  loanAmount: string;
  loanPurpose: string;
  paymentMethod: string;
  location: string;
}

export const DEFAULT_LOAN_CONTRACT_SPECIFIC: LoanContractSpecific = {
  loanAmount: '',
  loanPurpose: 'Tiêu dùng cá nhân',
  paymentMethod: 'Chuyển khoản hoặc tiền mặt',
  location: '',
};

export const loanContractTemplate: DocTemplate<LoanContractSpecific> = {
  id: 'loan_contract',
  label: 'Giấy Vay Tiền',
  icon: Coins,
  specificDefaults: DEFAULT_LOAN_CONTRACT_SPECIFIC,
  buildHtml: (common: DossierCommon, s: LoanContractSpecific) =>
    buildLoanContractHtml({
      partyA: {
        name: common.partyA.name,
        birthYear: common.partyA.birthYear,
        cccd: common.partyA.cccd,
        cccdDate: common.partyA.cccdDate,
        cccdPlace: common.partyA.cccdPlace,
        address: common.partyA.address,
      },
      partyB: {
        name: common.partyB.name,
        birthYear: common.partyB.birthYear,
        cccd: common.partyB.cccd,
        cccdDate: common.partyB.cccdDate,
        cccdPlace: common.partyB.cccdPlace,
        address: common.partyB.address,
      },
      contractDate: common.contractDate,
      location: s.location,
      loanAmount: s.loanAmount || common.totalAmount,
      loanPurpose: s.loanPurpose,
      startDate: common.startDate,
      endDate: common.endDate,
      paymentMethod: s.paymentMethod,
    }),
};
