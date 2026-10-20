// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { KpiTargetsData } from '../../types/kpi';

const h = vi.hoisted(() => ({ data: null as KpiTargetsData | null }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
vi.mock('../../hooks/useKpiTargets', () => ({ useKpiTargets: () => ({
  data: h.data, error: null, loading: h.data === null, selectPeriod: vi.fn(), create: vi.fn(),
  save: vi.fn(), changeStatus: vi.fn(), reload: vi.fn(),
}) }));
vi.mock('../team/KpiTargetsTable', () => ({ KpiTargetsTable: () => <div>Targets</div> }));
vi.mock('../team/KpiTargetForms', () => ({ KpiPeriodForm: () => null, KpiTargetForm: () => null }));
vi.mock('../team/KpiPeriodStatusForm', () => ({ KpiPeriodStatusForm: () => null }));
vi.mock('../team/KpiResultsPanel', () => ({ KpiResultsPanel: ({ revision }: { revision: number }) => <h2>Kết quả {revision}</h2> }));
vi.mock('../team/KpiImportPanel', () => ({ KpiImportPanel: ({ onPublished }: { onPublished: () => void }) => <button onClick={onPublished}>Công bố</button> }));
import { KpiTargetsWorkspace } from '../team/KpiTargetsWorkspace';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('keeps exactly one report after reloading targets and publishing an import', () => {
  const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
  const data: KpiTargetsData = {
    definitions: [], periods: [{ Id:'period', TeamId:'team', Month:'2026-09-01', Status:'open' }],
    periodId:'period', teamTargets:[], memberTargets:[],
  };
  h.data = data;
  const view = render(<KpiTargetsWorkspace teamId="team" members={[]} manage viewTeam />);
  h.data = null;
  view.rerender(<KpiTargetsWorkspace teamId="team" members={[]} manage viewTeam />);
  h.data = data;
  view.rerender(<KpiTargetsWorkspace teamId="team" members={[]} manage viewTeam />);
  fireEvent.click(screen.getByRole('button', { name:'Công bố' }));
  expect(screen.getAllByRole('heading', { name:/Kết quả/ })).toHaveLength(1);
  expect(screen.getByRole('heading', { name:'Kết quả 1' })).toBeTruthy();
  expect(warn.mock.calls.filter(args => args.some(arg => String(arg).includes('same key')))).toEqual([]);
});
