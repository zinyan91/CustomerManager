import { Handshake } from 'lucide-react';
import type { DocumentDraft } from '../../../../lib/documentHtml';
import { buildDocumentHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';
import { baseDraft } from '../legacyDraft';

export interface DepositSpecific {
  buyerTitle: string;
  sellerTitle: string;

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

export const DEFAULT_DEPOSIT_SPECIFIC: DepositSpecific = {
  buyerTitle: 'Ông',
  sellerTitle: 'Ông',

  parcelNo: '581',
  mapSheetNo: '7',
  area: '222,1',
  areaInWords: 'Hai trăm hai mươi hai phẩy một mét vuông',
  parcelAddress: 'Khu phố Hiệp Thạnh, Phường Hiệp Ninh, Thành phố Tây Ninh, Tỉnh Tây Ninh',
  urbanResidentialArea: '100',
  perennialCropArea: '122,1',
  certificateNo: 'DN 698444',
  certificateBookNo: 'CN 12348',
  certificateIssuer: 'Chi nhánh Văn phòng đăng ký đất đai Thành phố Tây Ninh',
  certificateDate: '05/12/2024',

  transferPrice: '2.350.000.000',
  deposit1: '600.000.000',
  payment2: '1.750.000.000',
  incomeTaxBy: 'A',
  registrationTaxBy: 'B',

  signPlace: 'Tây Ninh',
  signDate: '2026-08-04',
};

export function depositToLegacyParams(common: DossierCommon, s: DepositSpecific): DocumentDraft {
  return {
    ...baseDraft(),
    deposit: {
      buyerTitle: s.buyerTitle || 'Ông',
      buyerName: common.partyA.name || 'LÊ VĂN KHÁNH',
      buyerBirthYear: common.partyA.birthYear || '2003',
      buyerCccd: common.partyA.cccd || '0792 0302 9484',
      buyerCccdDate: common.partyA.cccdDate || '11/04/2024',
      buyerCccdPlace: common.partyA.cccdPlace || 'Cục Cảnh Sát',
      buyerAddress: common.partyA.address || '316 Phú Thọ Hòa, Phú Thọ Hòa, Tân Phú, Tp.HCM',

      sellerTitle: s.sellerTitle || 'Ông',
      sellerName: common.partyB.name || 'PHAN THANH HẬU',
      sellerBirthYear: common.partyB.birthYear || '1974',
      sellerCccd: common.partyB.cccd || '0870 7400 7100',
      sellerCccdDate: common.partyB.cccdDate || '11/08/2022',
      sellerCccdPlace: common.partyB.cccdPlace || 'Cục Cảnh Sát',
      sellerAddress: common.partyB.address || '40, Khu phố 2, Phường 3, TP. Tây Ninh, Tây Ninh',

      parcelNo: s.parcelNo,
      mapSheetNo: s.mapSheetNo,
      area: s.area,
      areaInWords: s.areaInWords,
      parcelAddress: s.parcelAddress,
      urbanResidentialArea: s.urbanResidentialArea,
      perennialCropArea: s.perennialCropArea,
      certificateNo: s.certificateNo,
      certificateBookNo: s.certificateBookNo,
      certificateIssuer: s.certificateIssuer,
      certificateDate: s.certificateDate,

      transferPrice: s.transferPrice || common.totalAmount || '2.350.000.000',
      deposit1: s.deposit1 || '600.000.000',
      payment2: s.payment2 || '1.750.000.000',
      incomeTaxBy: s.incomeTaxBy || 'A',
      registrationTaxBy: s.registrationTaxBy || 'B',

      signPlace: s.signPlace || 'Tây Ninh',
      signDate: s.signDate || common.contractDate || '2026-08-04',
    },
  };
}

export const depositTemplate: DocTemplate<DepositSpecific> = {
  id: 'deposit',
  label: 'HĐ Đặt Cọc (QSDĐ)',
  icon: Handshake,
  specificDefaults: DEFAULT_DEPOSIT_SPECIFIC,
  buildHtml: (common, s) => buildDocumentHtml('deposit', depositToLegacyParams(common, s)),
};
