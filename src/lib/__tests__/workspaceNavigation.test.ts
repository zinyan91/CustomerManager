import { describe, expect, it, vi } from 'vitest';
import { NAV_ITEMS } from '../navigation';
import { HUB_TASKS } from '../hubTasks';
import { MODULE_IDS, canOpenPath } from '../modules';
import {
  visibleWorkspaceSections, workspaceItemOfPath, workspaceItemPath, workspaceSectionOfPath,
  legacyHubDestination,
} from '../workspaceNavigation';

describe('workspace navigation', () => {
  it('keeps Team & KPI under Overview in both development and production with credit enabled', () => {
    expect(workspaceSectionOfPath('/team-kpi')).toBe('overview');
    expect(workspaceSectionOfPath('/dashboard')).toBe('overview');
    const overview = visibleWorkspaceSections(['credit'], false).find(section => section.id === 'overview')!;
    expect(overview.items.map(item => item.id)).toEqual(['dashboard', 'team-kpi', 'loan-progress', 'reports']);
    expect(workspaceItemPath(overview.items[1], 55)).toBe('/team-kpi');
    expect(workspaceItemPath(overview.items[2], 55)).toBe('/loan-progress');
    expect(workspaceSectionOfPath('/loan-progress')).toBe('overview');
    expect(canOpenPath(['dispatch'], '/loan-progress')).toBe(false);
    expect(canOpenPath(['dispatch'], '/team-kpi')).toBe(false);
    expect(visibleWorkspaceSections(['dispatch'], false).flatMap(section => section.items).some(item => item.id === 'team-kpi')).toBe(false);
    vi.stubEnv('DEV', false);
    try {
      expect(visibleWorkspaceSections(MODULE_IDS, true).flatMap(section => section.items).some(item => item.id === 'team-kpi')).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('covers existing navigation and Hub tasks exactly once without changing their URLs', () => {
    const items = visibleWorkspaceSections(MODULE_IDS, true).flatMap(section => section.items);
    expect(new Set(items.map(item => item.id)).size).toBe(items.length);
    for (const source of [...NAV_ITEMS, ...HUB_TASKS]) {
      expect(items.find(item => item.id === source.id)?.path).toBe(source.path);
    }
    for (const item of items) expect(item.screenId).toBeTruthy();
  });

  it.each([
    ['/tools/business-plan', 'finance'], ['/tools/calculators', 'finance'],
    ['/tools/rate-quote', 'finance'], ['/tools/inventory', 'retail'],
    ['/hub/estimate', 'retail'], ['/hub/toi', 'finance'],
    ['/hub/corporate-financial', 'finance'], ['/hub/documents', 'documents'],
    ['/office/calc/123', 'overview'], ['/office/writer/shared/abc', 'overview'],
    ['/dispatches', 'dispatch'], ['/storage', 'storage'],
    ['/customers/55/loans/12/schedule', 'credit'], ['/customers/55/profile', 'credit'],
    ['/reference/quiz/', 'reference'], ['/tools/cost-of-funds', 'finance'],
    ['/dashboard', 'overview'], ['/settings', 'system'], ['/admin/users', undefined],
  ])('resolves %s to %s', (path, section) => {
    expect(workspaceSectionOfPath(path)).toBe(section);
  });

  it('keeps special Hub tasks separate from their generic screen aliases', () => {
    expect(workspaceItemOfPath('/hub/estimate')?.id).toBe('estimate');
    expect(workspaceItemOfPath('/hub/toi')?.id).toBe('toi');
    expect(workspaceItemOfPath('/tools/business-plan')?.id).toBe('business-plan');
  });

  it('uses the actual allowed task path, including special TOI and estimate permissions', () => {
    const rates = visibleWorkspaceSections(['rates'], false).find(section => section.id === 'finance')!;
    expect(rates.items.map(item => item.id)).toEqual(['toi', 'rate-quote', 'cof']);
    expect(visibleWorkspaceSections(['dispatch'], false).map(section => section.id)).toEqual(['dispatch', 'system']);
    expect(visibleWorkspaceSections(['dispatch'], false).find(section => section.id === 'dispatch')?.items.map(item => item.id)).toEqual(['dispatches']);
  });
  it('distributes catalog tools once and keeps Reference limited to lookups',()=>{
    const sections=visibleWorkspaceSections(MODULE_IDS,false);
    expect(sections.find(section=>section.id==='reference')?.items.map(item=>item.id)).toEqual(['mdsdv','card-policies','quiz-bank']);
    expect(sections.find(section=>section.id==='overview')?.items.some(item=>item.id==='reports')).toBe(true);
    expect(sections.find(section=>section.id==='finance')?.items.some(item=>item.id==='reports')).toBe(false);
    expect(workspaceSectionOfPath('/hub/reports')).toBe('overview');
    expect(workspaceSectionOfPath('/tools/reports')).toBe('overview');
    expect(visibleWorkspaceSections(['tools'],false).find(section=>section.id==='overview')?.items.map(item=>item.id)).toEqual(['office','reports']);
    expect(sections.flatMap(section=>section.items).some(item=>item.id==='hub')).toBe(false);
    expect(legacyHubDestination(MODULE_IDS)).toBe('/hub/mdsdv');
    expect(legacyHubDestination(['quiz'])).toBe('/hub/quiz');
    expect(legacyHubDestination(['dispatch'])).toBe('/dispatches');
    expect(legacyHubDestination([])).toBe('/settings');
  });

  it('never exposes a forbidden destination for any module combination', () => {
    for (let mask = 0; mask < 2 ** MODULE_IDS.length; mask++) {
      const allowed = MODULE_IDS.filter((_, index) => mask & (1 << index));
      for (const section of visibleWorkspaceSections(allowed, false)) {
        expect(section.items.length).toBeGreaterThan(0);
        for (const item of section.items) {
          expect(item.adminOnly).not.toBe(true);
          expect(canOpenPath(allowed, item.path), item.path).toBe(true);
        }
      }
    }
  });

  it('keeps customer context on record links and leaves independent task paths intact', () => {
    const items = visibleWorkspaceSections(MODULE_IDS, false).flatMap(section => section.items);
    expect(workspaceItemPath(items.find(item => item.id === 'loans')!, 55)).toBe('/customers/55/loans');
    expect(workspaceItemPath(items.find(item => item.id === 'collaterals')!, 55)).toBe('/customers/55/collaterals');
    expect(workspaceItemPath(items.find(item => item.id === 'toi')!, 55)).toBe('/hub/toi');
    expect(workspaceItemPath(items.find(item => item.id === 'office')!, 55)).toBe('/office');
  });
});
