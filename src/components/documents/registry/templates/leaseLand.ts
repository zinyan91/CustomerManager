import { LandPlot } from 'lucide-react';
import { buildLeaseLandHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';

export interface LeaseLandSpecific {
  contractNo: string;
  location: string;
  landArea: string;
  landAddress: string;
  termYears: string;
  purpose: string;
  rentPricePerYear: string;
  paymentMethod: string;
}

export const DEFAULT_LEASE_LAND_SPECIFIC: LeaseLandSpecific = {
  contractNo: '',
  location: '',
  landArea: '',
  landAddress: '',
  termYears: '5',
  purpose: 'Sản xuất nông nghiệp / mặt bằng kinh doanh',
  rentPricePerYear: '',
  paymentMethod: 'Chuyển khoản hoặc tiền mặt hàng năm',
};

export const leaseLandTemplate: DocTemplate<LeaseLandSpecific> = {
  id: 'lease_land',
  label: 'HĐ Thuê Đất',
  icon: LandPlot,
  specificDefaults: DEFAULT_LEASE_LAND_SPECIFIC,
  buildHtml: (common: DossierCommon, s: LeaseLandSpecific) =>
    buildLeaseLandHtml({
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
      contractNo: s.contractNo,
      contractDate: common.contractDate,
      location: s.location,
      landArea: s.landArea,
      landAddress: s.landAddress,
      termYears: s.termYears,
      startDate: common.startDate,
      endDate: common.endDate,
      purpose: s.purpose,
      rentPricePerYear: s.rentPricePerYear || common.totalAmount,
      paymentMethod: s.paymentMethod,
    }),
};
