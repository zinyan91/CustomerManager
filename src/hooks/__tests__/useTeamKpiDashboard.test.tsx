// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KpiDashboardSource } from '../../types/kpiDashboard';

const h=vi.hoisted(() => ({ read:vi.fn() }));
vi.mock('../../context/AuthContext', () => ({ useAuth:() => ({ user:{ id:'me' },role:'user' }) }));
vi.mock('../../lib/api/kpiDashboardApi', () => ({ fetchKpiDashboard:h.read }));
import { useTeamKpiDashboard } from '../useTeamKpiDashboard';
const empty:KpiDashboardSource={
  definitions:[],periods:[],batches:[],observations:[],memberships:[],teamTargets:[],memberTargets:[],
};
beforeEach(() => { vi.resetAllMocks(); h.read.mockResolvedValue(empty); });
afterEach(cleanup);

describe('one source for the reporting dashboard', () => {
  it('exposes the report only once its complete source has loaded', async () => {
    const { result }=renderHook(() => useTeamKpiDashboard('team','2026'));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual(empty));
    expect(result.current.loading).toBe(false);
  });
  it('hides the old year immediately and discards its late response', async () => {
    let oldResolve!:(value:KpiDashboardSource) => void;
    h.read.mockReturnValueOnce(new Promise(resolve => { oldResolve=resolve; }));
    const { result,rerender }=renderHook(({ year }) => useTeamKpiDashboard('team',year),{ initialProps:{ year:'2026' } });
    rerender({ year:'2025' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => oldResolve({ ...empty,definitions:[{ Code:'stale',Name:'Old',Unit:'count',Aggregation:'flow',SortOrder:1 }] }));
    expect(result.current.data).toEqual(empty);
  });
  it('keeps the server error distinct from missing KPI values', async () => {
    h.read.mockRejectedValue(new Error('source unavailable'));
    const { result }=renderHook(() => useTeamKpiDashboard('team','2026'));
    await waitFor(() => expect(result.current.error).toBe('source unavailable'));
    expect(result.current.data).toBeNull();
  });
});
