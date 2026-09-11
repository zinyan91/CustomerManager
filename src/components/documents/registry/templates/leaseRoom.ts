import { DoorOpen } from 'lucide-react';
import { buildLeaseRoomHtml } from '../../../../lib/documentHtml';
import type { DocTemplate, DossierCommon } from '../types';

export interface LeaseRoomSpecific {
  partyAPhone: string;
  partyBPhone: string;
  roomNo: string;
  houseNo: string;
  location: string;
  coTenants: string;
  monthlyPrice: string;
  purpose: string;
  termMonths: string;
}

export const DEFAULT_LEASE_ROOM_SPECIFIC: LeaseRoomSpecific = {
  partyAPhone: '',
  partyBPhone: '',
  roomNo: '',
  houseNo: '',
  location: '',
  coTenants: '',
  monthlyPrice: '',
  purpose: 'Ở',
  termMonths: '',
};

export const leaseRoomTemplate: DocTemplate<LeaseRoomSpecific> = {
  id: 'lease_room',
  label: 'HĐ Thuê Phòng Trọ',
  icon: DoorOpen,
  specificDefaults: DEFAULT_LEASE_ROOM_SPECIFIC,
  buildHtml: (common: DossierCommon, s: LeaseRoomSpecific) =>
    buildLeaseRoomHtml({
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
      partyAPhone: s.partyAPhone,
      partyBPhone: s.partyBPhone,
      roomNo: s.roomNo,
      houseNo: s.houseNo,
      location: s.location,
      coTenants: s.coTenants,
      monthlyPrice: s.monthlyPrice,
      purpose: s.purpose,
      termMonths: s.termMonths,
    }),
};
