import { FolderOpen, Hammer } from 'lucide-react';
import type { Dossier } from './types';

export const DOSSIERS: Dossier[] = [
  {
    id: 'giai_ngan',
    label: 'Hồ sơ giải ngân',
    icon: FolderOpen,
    documents: [
      { templateId: 'sale_contract' },
      { templateId: 'bang_ke' },
      { templateId: 'payment_request_sale' },
      { templateId: 'cam_ket', optional: true },
    ],
  },
  {
    id: 'sua_chua_nha',
    label: 'Hồ sơ sửa chữa nhà',
    icon: Hammer,
    documents: [
      { templateId: 'construction' },
      { templateId: 'payment_request_const' },
      { templateId: 'cam_ket', optional: true },
    ],
  },
];
