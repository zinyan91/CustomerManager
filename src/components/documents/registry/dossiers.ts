import { FolderOpen } from 'lucide-react';
import type { Dossier } from './types';

export const DOSSIERS: Dossier[] = [
  {
    id: 'giai_ngan',
    label: 'Hồ sơ giải ngân',
    icon: FolderOpen,
    documents: [
      { templateId: 'sale_contract' },
      { templateId: 'payment_request_sale' },
      { templateId: 'cam_ket', optional: true },
    ],
  },
];
