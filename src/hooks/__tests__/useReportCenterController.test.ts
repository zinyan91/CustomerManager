// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../lib/reports/gather', () => ({
  gatherSheets: vi.fn(async () => ({ sheets: [{ name: 'A', rows: [[{ value: 'x' }]] }], failed: [] })),
}));
vi.mock('../../lib/xlsExport', () => ({
  downloadBytes: vi.fn(() => { throw new Error('trinh duyet chan tai tep'); }),
}));

import { useReportCenterController } from '../useReportCenterController';

describe('useReportCenterController — F5: khong im lang khi xuat tep that bai', () => {
  it('loi khi dung hoac tai tep thi hien thong bao va ghi console.error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useReportCenterController());

    await act(async () => {
      await result.current.exportSelected();
    });

    expect(result.current.error).toBe('trinh duyet chan tai tep');
    expect(result.current.exporting).toBe(false);
    expect(spy).toHaveBeenCalled();
  });
});
