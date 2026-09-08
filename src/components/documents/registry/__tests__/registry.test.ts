import { it, expect } from 'vitest';
import { TEMPLATE_BY_ID } from '../templates';
import { DOSSIERS } from '../dossiers';

it('every dossier document references an existing template', () => {
  for (const dossier of DOSSIERS) {
    for (const doc of dossier.documents) {
      expect(TEMPLATE_BY_ID[doc.templateId], `missing template ${doc.templateId}`).toBeDefined();
    }
  }
});

it('template ids are unique and match their map key', () => {
  for (const [key, tpl] of Object.entries(TEMPLATE_BY_ID)) {
    expect(tpl.id).toBe(key);
  }
});

it('dossier ids are unique', () => {
  const ids = DOSSIERS.map(d => d.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it('Giải ngân dossier lists its documents in order', () => {
  const giaiNgan = DOSSIERS.find(d => d.id === 'giai_ngan');
  expect(giaiNgan?.documents.map(d => d.templateId)).toEqual([
    'sale_contract', 'bang_ke', 'payment_request_sale', 'cam_ket',
  ]);
  expect(giaiNgan?.documents.find(d => d.templateId === 'cam_ket')?.optional).toBe(true);
});

it('Sửa chữa nhà dossier includes dự toán after construction', () => {
  const d = DOSSIERS.find(x => x.id === 'sua_chua_nha');
  expect(d?.documents.map(x => x.templateId)).toEqual([
    'construction', 'const_estimate', 'payment_request_const', 'cam_ket',
  ]);
});

it('Cho thuê dossier lists its documents', () => {
  const d = DOSSIERS.find(x => x.id === 'cho_thue');
  expect(d?.documents.map(x => x.templateId)).toEqual(['lease_mb', 'lease_house']);
});
