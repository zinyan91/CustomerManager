import { FolderOpen, Hammer, Home, Folder } from 'lucide-react';
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
      { templateId: 'payment_request_bang_ke' },
      { templateId: 'cam_ket', optional: true },
    ],
  },
  {
    id: 'sua_chua_nha',
    label: 'Hồ sơ sửa chữa nhà',
    icon: Hammer,
    documents: [
      { templateId: 'construction' },
      { templateId: 'const_estimate' },
      { templateId: 'payment_request_const' },
      { templateId: 'cam_ket', optional: true },
    ],
  },
  {
    id: 'cho_thue',
    label: 'Hồ sơ cho thuê',
    icon: Home,
    documents: [
      { templateId: 'lease_mb' },
      { templateId: 'lease_house' },
    ],
  },
  {
    id: 'khac',
    label: 'Khác',
    icon: Folder,
    documents: [
      { templateId: 'deposit' },
    ],
  },
];

