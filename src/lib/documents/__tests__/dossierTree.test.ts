import { describe, it, expect } from 'vitest';
import { buildDossierTree, nodeIdOf, parseNodeId } from '../dossierTree';

const DS = [
  { id: 'giai_ngan', label: 'Hồ sơ giải ngân', documents: [{ templateId: 'sale_contract' }, { templateId: 'cam_ket', optional: true }] },
  { id: 'sua_chua_nha', label: 'Hồ sơ sửa chữa nhà', documents: [{ templateId: 'cam_ket', optional: true }] },
];

describe('buildDossierTree', () => {
  const cay = buildDossierTree(DS, id => `L:${id}`, (d, t) => d === 'sua_chua_nha' && t === 'cam_ket');

  it('mỗi bộ là một thư mục, lá theo đúng thứ tự', () => {
    expect(cay.map(n => n.id)).toEqual(['giai_ngan', 'sua_chua_nha']);
    expect(cay[0].children!.map(c => c.id)).toEqual(['giai_ngan/sale_contract', 'giai_ngan/cam_ket']);
    expect(cay[0].children![0].label).toBe('L:sale_contract');
  });

  it('lá tùy chọn đánh dấu optional, lá bị loại đánh dấu disabled theo từng bộ', () => {
    expect(cay[0].children![1]).toMatchObject({ optional: true, disabled: false });
    expect(cay[1].children![0]).toMatchObject({ optional: true, disabled: true });
    expect(cay[0].children![0]).toMatchObject({ optional: false, disabled: false });
  });

  it('nodeIdOf và parseNodeId đổi qua lại', () => {
    expect(parseNodeId(nodeIdOf('van_hanh_tap_trung', 'bm01'))).toEqual({ dossierId: 'van_hanh_tap_trung', docId: 'bm01' });
    expect(parseNodeId('giai_ngan')).toBeNull();
    expect(parseNodeId('/x')).toBeNull();
  });
});
