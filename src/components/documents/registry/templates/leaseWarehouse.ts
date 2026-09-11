import { Warehouse } from 'lucide-react';
import { buildLeaseWarehouseHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';

export interface LeaseWarehouseSpecific {
  area: string;
  warehouseAddress: string;
  paymentDay: string;
  monthlyPrice: string;
  signPlace: string;
}

export const DEFAULT_LEASE_WAREHOUSE_SPECIFIC: LeaseWarehouseSpecific = {
  area: '65',
  warehouseAddress: '',
  paymentDay: '25',
  monthlyPrice: '',
  signPlace: 'TP.HCM',
};

export const leaseWarehouseTemplate: DocTemplate<LeaseWarehouseSpecific> = {
  id: 'lease_warehouse',
  label: 'HĐ Thuê Nhà Kho',
  icon: Warehouse,
  specificDefaults: DEFAULT_LEASE_WAREHOUSE_SPECIFIC,
  buildHtml: (common: DossierCommon, s: LeaseWarehouseSpecific) =>
    buildLeaseWarehouseHtml({
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
      area: s.area,
      warehouseAddress: s.warehouseAddress,
      startDate: common.startDate,
      endDate: common.endDate,
      monthlyPrice: s.monthlyPrice,
      paymentDay: s.paymentDay,
      signPlace: s.signPlace,
      signDate: common.contractDate,
    }),
};
