import { describe, it, expect } from 'vitest';
import { initDossierState, dossierReducer, initWorkspaceState, workspaceReducer } from '../documentDossierReducer';

describe('dossierReducer', () => {
  it('initializes with first doc active and specific slices for each doc', () => {
    const s = initDossierState('giai_ngan');
    expect(s.activeDossierId).toBe('giai_ngan');
    expect(s.activeDocId).toBe('sale_contract');
    expect(Object.keys(s.specificByDocId).sort()).toEqual(
      ['bang_ke', 'cam_ket', 'payment_request_bang_ke', 'payment_request_sale', 'sale_contract'],
    );
    expect(s.excludedDocIds).toEqual([]);
  });

  it('selectDoc keeps common intact (fill once, flow to all)', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'patchCommon', patch: { totalAmount: '1.000.000' } });
    s = dossierReducer(s, { type: 'selectDoc', docId: 'payment_request_sale' });
    expect(s.activeDocId).toBe('payment_request_sale');
    expect(s.common.totalAmount).toBe('1.000.000');
  });

  it('patchSpecific updates only the targeted doc slice', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'patchSpecific', docId: 'sale_contract', patch: { paymentStage1: '50' } });
    expect((s.specificByDocId.sale_contract as any).paymentStage1).toBe('50');
    expect((s.specificByDocId.payment_request_sale as any).paymentStage1).toBeUndefined();
  });


  it('toggleOptional adds/removes a doc from excluded list', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'toggleOptional', docId: 'cam_ket' });
    expect(s.excludedDocIds).toEqual(['cam_ket']);
    s = dossierReducer(s, { type: 'toggleOptional', docId: 'cam_ket' });
    expect(s.excludedDocIds).toEqual([]);
  });

  it('excluding the active optional doc moves active to first non-excluded doc', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'selectDoc', docId: 'cam_ket' });
    expect(s.activeDocId).toBe('cam_ket');
    s = dossierReducer(s, { type: 'toggleOptional', docId: 'cam_ket' });
    expect(s.excludedDocIds).toContain('cam_ket');
    expect(s.activeDocId).not.toBe('cam_ket');
    expect(s.activeDocId).toBe('sale_contract');
  });

  it('toggling an optional doc that is not active does not move active', () => {
    let s = initDossierState('giai_ngan');
    expect(s.activeDocId).toBe('sale_contract');
    s = dossierReducer(s, { type: 'toggleOptional', docId: 'cam_ket' });
    expect(s.activeDocId).toBe('sale_contract');
  });
});

describe('workspaceReducer — mỗi bộ giữ dữ liệu riêng', () => {
  const cur = (s: ReturnType<typeof initWorkspaceState>) => s.byDossier[s.activeDossierId];

  it('đổi bộ rồi quay lại vẫn còn dữ liệu đã nhập', () => {
    let s = initWorkspaceState('giai_ngan');
    s = workspaceReducer(s, { type: 'patchCommon', patch: { totalAmount: '1.000' } });
    s = workspaceReducer(s, { type: 'selectDossier', dossierId: 'van_hanh_tap_trung' });
    expect(cur(s).activeDossierId).toBe('van_hanh_tap_trung');
    s = workspaceReducer(s, { type: 'selectDossier', dossierId: 'giai_ngan' });
    expect(cur(s).common.totalAmount).toBe('1.000');
  });

  it('chọn lại chính bộ đang mở không xoá dữ liệu', () => {
    let s = initWorkspaceState('giai_ngan');
    s = workspaceReducer(s, { type: 'patchCommon', patch: { totalAmount: '999' } });
    s = workspaceReducer(s, { type: 'selectDossier', dossierId: 'giai_ngan' });
    expect(cur(s).common.totalAmount).toBe('999');
  });

  it('selectDocIn chuyển bộ và chọn đúng biểu mẫu', () => {
    let s = initWorkspaceState('giai_ngan');
    s = workspaceReducer(s, { type: 'selectDocIn', dossierId: 'van_hanh_tap_trung', docId: 'bm02_to_trinh_giai_ngan' });
    expect(s.activeDossierId).toBe('van_hanh_tap_trung');
    expect(cur(s).activeDocId).toBe('bm02_to_trinh_giai_ngan');
  });

  it('cam_ket ở hai bộ bật/tắt độc lập', () => {
    let s = initWorkspaceState('giai_ngan');
    s = workspaceReducer(s, { type: 'toggleOptionalIn', dossierId: 'sua_chua_nha', docId: 'cam_ket' });
    expect(s.byDossier.sua_chua_nha.excludedDocIds).toEqual(['cam_ket']);
    expect(s.byDossier.giai_ngan.excludedDocIds).toEqual([]);
    expect(s.activeDossierId).toBe('giai_ngan');
  });

  it('thao tác thường áp lên bộ đang mở', () => {
    let s = initWorkspaceState('giai_ngan');
    s = workspaceReducer(s, { type: 'selectDoc', docId: 'bang_ke' });
    expect(cur(s).activeDocId).toBe('bang_ke');
  });
});
