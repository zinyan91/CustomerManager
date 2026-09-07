import { describe, it, expect } from 'vitest';
import { initDossierState, dossierReducer } from '../documentDossierReducer';

describe('dossierReducer', () => {
  it('initializes with first doc active and specific slices for each doc', () => {
    const s = initDossierState('giai_ngan');
    expect(s.activeDossierId).toBe('giai_ngan');
    expect(s.activeDocId).toBe('sale_contract');
    expect(Object.keys(s.specificByDocId).sort()).toEqual(
      ['cam_ket', 'payment_request_sale', 'sale_contract'],
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

  it('selectDossier reloads common (previous edits dropped)', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'patchCommon', patch: { totalAmount: '999' } });
    s = dossierReducer(s, { type: 'selectDossier', dossierId: 'giai_ngan' });
    expect(s.common.totalAmount).toBe('');
  });

  it('toggleOptional adds/removes a doc from excluded list', () => {
    let s = initDossierState('giai_ngan');
    s = dossierReducer(s, { type: 'toggleOptional', docId: 'cam_ket' });
    expect(s.excludedDocIds).toEqual(['cam_ket']);
    s = dossierReducer(s, { type: 'toggleOptional', docId: 'cam_ket' });
    expect(s.excludedDocIds).toEqual([]);
  });
});
