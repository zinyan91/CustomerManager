import type { DocumentDraft } from '../../../lib/documentHtml';
import { DEFAULT_DEPOSIT_CONTRACT } from '../depositContract';

export function baseDraft(): DocumentDraft {
  return {
    mbContractDate: '', mbPartyAName: '', mbPartyACccd: '', mbPartyACccdDate: '',
    mbPartyAAddress: '', mbPartyBName: '', mbPartyBCccd: '', mbPartyBCccdDate: '',
    mbPartyBAddress: '', mbLocation: '', mbStartDate: '', mbEndDate: '',
    mbMonthlyPrice: '', mbDepositAmount: '',
    lhFloors: '', lhLandArea: '', lhHouseArea: '', lhHandoverDate: '', lhPaymentDay: '',
    constContractDate: '', constPartyAName: '', constPartyACccd: '', constPartyAAddress: '',
    constPartyBName: '', constPartyBCccd: '', constSiteAddress: '', constStartDate: '',
    constEndDate: '', constTotalPrice: '', constDepositStage1: '', constStage2Amount: '',
    constWarrantyMonths: '', constItems: [],
    saleContractDate: '', saleBuyerName: '', saleBuyerAddress: '', saleSellerName: '',
    saleSellerCccd: '', saleSellerCccdDate: '', saleSellerCccdPlace: '',
    salePayMethod: 'cash', saleBankOwner: '', saleBankAccNo: '', saleBankName: '',
    saleBankBranch: '', salePaymentStage1: '', saleItems: [],
    saleStartDate: '', saleEndDate: '',
    deposit: DEFAULT_DEPOSIT_CONTRACT,
    payMethodType: 'transfer', payCashName: '', payCashCccd: '', payCashCccdDate: '',
    payCashCccdPlace: '', payBankOwner: '', payBankAccNo: '', payBankName: '',
    payBankBranch: '', payStages: [],
    recipientTitle: 'Ông',
    constDurationMonths: '', lhTermLabel: '',
  };
}
