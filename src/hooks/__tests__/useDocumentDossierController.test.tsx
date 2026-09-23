// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentDossierController } from '../useDocumentDossierController';

describe('useDocumentDossierController', () => {
  it('starts on the first dossier with the first doc active and builds HTML', () => {
    const { result } = renderHook(() => useDocumentDossierController());
    expect(result.current.activeDossier.id).toBe('giai_ngan');
    expect(result.current.state.activeDocId).toBe('sale_contract');
    expect(typeof result.current.activeHtml).toBe('string');
    expect(result.current.activeHtml.length).toBeGreaterThan(0);
  });

  it('patchCommon flows into the active document HTML', () => {
    const { result } = renderHook(() => useDocumentDossierController());
    act(() => result.current.patchCommon({
      partyA: { ...result.current.state.common.partyA, name: 'NGUYỄN VĂN TEST' },
    }));
    expect(result.current.activeHtml).toContain('NGUYỄN VĂN TEST');
  });

  it('toggleOptional marks cam_ket excluded', () => {
    const { result } = renderHook(() => useDocumentDossierController());
    act(() => result.current.toggleOptional('cam_ket'));
    expect(result.current.isExcluded('cam_ket')).toBe(true);
  });

  it('đổi bộ qua selectDocIn rồi quay lại vẫn giữ dữ liệu', () => {
    const { result } = renderHook(() => useDocumentDossierController());
    act(() => result.current.patchCommon({ totalAmount: '5.000' }));
    act(() => result.current.selectDocIn('van_hanh_tap_trung', 'bm01_de_nghi_giai_ngan'));
    expect(result.current.activeDossier.id).toBe('van_hanh_tap_trung');
    act(() => result.current.selectDossier('giai_ngan'));
    expect(result.current.state.common.totalAmount).toBe('5.000');
    expect(result.current.isExcludedIn('sua_chua_nha', 'cam_ket')).toBe(false);
  });
});
