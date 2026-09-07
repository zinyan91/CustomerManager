import { FileSignature } from 'lucide-react';
import { buildGiayCamKetHtml } from '../../../../lib/documentHtml';
import type { DocTemplate } from '../types';

export type CamKetSpecific = Record<string, never>;

export const camKetTemplate: DocTemplate<CamKetSpecific> = {
  id: 'cam_ket',
  label: 'Giấy Cam Kết',
  icon: FileSignature,
  specificDefaults: {},
  buildHtml: (common) =>
    buildGiayCamKetHtml({
      hoTen: common.partyB.name,
      cccd: common.partyB.cccd,
      ngayCap: common.partyB.cccdDate,
      noiCap: common.partyB.cccdPlace,
      ngayLap: common.contractDate,
    }),
};
