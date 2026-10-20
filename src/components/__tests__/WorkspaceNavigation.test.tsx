// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { LanguageProvider } from '../../context/LanguageContext';
import { SidebarCollapseProvider } from '../../context/SidebarCollapseContext';
import type { ModuleId } from '../../lib/modules';
import type { AppRole } from '../../lib/permissions';
import { PrimaryRail } from '../PrimaryRail';
import { Sidebar } from '../Sidebar';
import { CommandPalette } from '../CommandPalette';
import { DedicatedWorkspaceHeader } from '../hub/DedicatedWorkspaceHeader';

const state = vi.hoisted(() => ({ allowed: null as ModuleId[] | null, role: 'master_admin' as AppRole }));
vi.mock('../../context/ModulesContext', async () => {
  const { MODULE_IDS } = await import('../../lib/modules');
  return { useModules: () => ({ allowed: state.allowed ?? MODULE_IDS, ready: true, error: null }) };
});
vi.mock('../../context/AuthContext', async () => {
  const { can } = await import('../../lib/permissions');
  return { useAuth: () => ({ can: (capability: Parameters<typeof can>[1]) => can(state.role, capability) }) };
});
vi.mock('../common/UserScopeSelector', () => ({ UserScopeSelector: () => null }));

function NavigationFixture({ search = false }: { search?: boolean }) {
  const location = useLocation();
  return <>
    <PrimaryRail isMasterAdmin={state.role === 'master_admin'} />
    <Sidebar contextual isMasterAdmin={state.role === 'master_admin'} />
    <CommandPalette isOpen={search} onClose={() => {}} isMasterAdmin={state.role === 'master_admin'} />
    <output data-testid="destination">{location.pathname}</output>
    <section data-testid="existing-content">Nội dung chức năng giữ nguyên</section>
  </>;
}
function mount(path: string, search = false) {
  return render(<MemoryRouter initialEntries={[path]}><LanguageProvider><SidebarCollapseProvider><NavigationFixture search={search} /></SidebarCollapseProvider></LanguageProvider></MemoryRouter>);
}
beforeEach(() => { localStorage.setItem('cm_sidebar_collapsed', 'false'); });
afterEach(() => { state.allowed = null; state.role = 'master_admin'; localStorage.clear(); cleanup(); });

describe('workspace shell navigation', () => {
  it('opens administration in the current tab and keeps both menus active at user details', () => {
    mount('/settings');
    const rail = screen.getByRole('navigation', { name: 'Phân hệ' });
    expect(document.querySelector('#app-sidebar a[href="/admin"]')).toBeNull();
    const admin = within(rail).getByRole('link', { name: 'Quản trị' });
    expect(admin.getAttribute('target')).toBeNull();
    fireEvent.click(admin);
    expect(screen.getByTestId('destination').textContent).toBe('/admin');
    expect([...document.querySelectorAll('#app-sidebar a')].map(link => link.getAttribute('href')))
      .toEqual(['/admin', '/admin/users', '/admin/teams', '/admin/kpi', '/admin/transfer', '/admin/storage']);
    fireEvent.click(within(document.querySelector('#app-sidebar') as HTMLElement).getByRole('link', { name: 'Người dùng' }));
    expect(screen.getByTestId('destination').textContent).toBe('/admin/users');
    expect(admin.getAttribute('aria-current')).toBe('page');
  });

  it('keeps Người dùng selected when editing module access', () => {
    mount('/admin/users/u1');
    expect(document.querySelector('#app-sidebar [aria-current="page"]')?.getAttribute('href')).toBe('/admin/users');
    expect(within(screen.getByRole('navigation', { name: 'Phân hệ' })).getByRole('link', { name: 'Quản trị' }).getAttribute('aria-current')).toBe('page');
  });

  it.each(['user_admin', 'user'] as AppRole[])('hides administrative navigation and search entries for %s', role => {
    state.role = role;
    mount('/settings', true);
    expect(document.querySelector('nav[aria-label="Phân hệ"] a[href="/admin"]')).toBeNull();
    expect(document.querySelector('#app-sidebar a[href^="/admin"]')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Tìm kiếm phân hệ, hợp đồng, khoản vay...'), { target: { value: 'Quản trị' } });
    expect(screen.getByText(/Không tìm thấy phân hệ tương ứng/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Người dùng/ })).toBeNull();
  });

  it('preserves only existing permitted tools for User Admin opening a direct admin URL', () => {
    state.role = 'user_admin';
    mount('/admin/users/u1');
    const links = [...document.querySelectorAll('#app-sidebar a')].map(link => link.getAttribute('href'));
    expect(links).toEqual(['/admin', '/admin/users', '/admin/transfer']);
    expect(document.querySelector('nav[aria-label="Phân hệ"] a[href="/admin"]')).toBeNull();
  });
  it('opens Reference directly and exposes only its three lookup tools',()=>{
    mount('/dashboard');
    fireEvent.click(screen.getByRole('navigation',{name:'Phân hệ'}).querySelector('a[href="/hub/mdsdv"]')!);
    expect(screen.getByTestId('destination').textContent).toBe('/hub/mdsdv');
    const sidebar=document.querySelector('#app-sidebar')!;
    expect([...sidebar.querySelectorAll('a')].map(link=>link.getAttribute('href'))).toEqual(['/hub/mdsdv','/hub/card-fees','/hub/quiz']);
    expect(sidebar.querySelector('a[href="/hub"]')).toBeNull();
  });
  it('opens Team and KPI below Overview in the secondary menu without adding a rail entry', () => {
    mount('/dashboard');
    const rail = screen.getByRole('navigation', { name: 'Phân hệ' });
    expect(within(rail).queryByRole('link', { name: 'Team & KPI' })).toBeNull();
    const sidebar = document.querySelector('#app-sidebar') as HTMLElement;
    expect(within(sidebar).getAllByRole('link').map(link => link.textContent)).toEqual(['Tổng quan', 'Team & KPI', 'Báo cáo tiến độ', 'Báo cáo', 'Báo cáo Excel']);
    expect(within(sidebar).getByRole('link',{name:'Báo cáo'}).getAttribute('href')).toBe('/office');
    fireEvent.click(within(sidebar).getByRole('link',{name:'Báo cáo Excel'}));
    expect(screen.getByTestId('destination').textContent).toBe('/hub/reports');
    expect(within(rail).getByRole('link',{name:'Tổng quan'}).getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(sidebar).getByRole('link',{name:'Báo cáo Excel'}));
    expect(screen.getByTestId('destination').textContent).toBe('/hub/reports');
    expect(within(rail).getByRole('link',{name:'Tổng quan'}).getAttribute('aria-current')).toBe('page');
    fireEvent.click(within(sidebar).getByRole('link', { name: 'Team & KPI' }));
    expect(screen.getByTestId('destination').textContent).toBe('/team-kpi');
    expect(within(rail).getByRole('link', { name: 'Tổng quan' }).getAttribute('aria-current')).toBe('page');
    expect(document.querySelector('#app-sidebar [aria-current="page"]')?.getAttribute('href')).toBe('/team-kpi');
    fireEvent.click(within(sidebar).getByRole('link', { name: 'Báo cáo tiến độ' }));
    expect(screen.getByTestId('destination').textContent).toBe('/loan-progress');
    expect(within(rail).queryByRole('link', { name: 'Báo cáo tiến độ' })).toBeNull();
    fireEvent.click(within(rail).getByRole('link', { name: 'Tổng quan' }));
    expect(screen.getByTestId('destination').textContent).toBe('/dashboard');
  });
  it.each([
    ['/hub/documents', 'Hồ sơ chứng từ'],
    ['/tools/business-plan', 'Phân tích'], ['/tools/calculators', 'Phân tích'],
    ['/tools/inventory', 'Dự toán'], ['/customers/55/loans', 'Tín dụng'],
    ['/office/calc/123', 'Tổng quan'],
    ['/dispatches', 'Quản lý văn thư'], ['/storage', 'Kho lưu trữ'],
  ])('marks the correct rail section at %s', (path, label) => {
    mount(path);
    const rail = screen.getByRole('navigation', { name: 'Phân hệ' });
    expect(within(rail).getByRole('link', { name: label }).getAttribute('aria-current')).toBe('page');
    expect(rail.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it('opens document management and storage as separate primary destinations', () => {
    mount('/storage');
    const rail = screen.getByRole('navigation', { name: 'Phân hệ' });
    expect(within(rail).getByRole('link', { name: 'Hồ sơ chứng từ' }).getAttribute('href')).toBe('/hub/documents');
    expect(within(rail).queryByRole('link',{name:'Tài liệu'})).toBeNull();
    expect(within(rail).getByRole('link',{name:'Quản lý văn thư'}).getAttribute('href')).toBe('/dispatches');
    expect(within(rail).getByRole('link',{name:'Kho lưu trữ'}).getAttribute('href')).toBe('/storage');
    expect(within(rail).queryByRole('button',{name:/menu phụ/})).toBeNull();
    fireEvent.click(within(rail).getByRole('link',{name:'Quản lý văn thư'}));
    expect(screen.getByTestId('destination').textContent).toBe('/dispatches');
    expect(within(rail).getByRole('link',{name:'Quản lý văn thư'}).getAttribute('aria-current')).toBe('page');
  });

  it('keeps record context while switching through the real sidebar links', () => {
    mount('/customers/55/loans');
    fireEvent.click(screen.getByRole('link', { name: 'Định giá TSĐB' }));
    expect(screen.getByTestId('destination').textContent).toBe('/customers/55/collaterals');
    expect(screen.getByTestId('existing-content').textContent).toBe('Nội dung chức năng giữ nguyên');
    expect(document.querySelector('#app-sidebar [aria-current="page"]')?.getAttribute('href')).toBe('/customers/55/collaterals');
  });

  it('opens a permitted finance entry rather than redirecting through a forbidden screen', () => {
    state.allowed = ['rates'];
    mount('/settings');
    const rail = screen.getByRole('navigation', { name: 'Phân hệ' });
    expect(within(rail).queryByRole('link', { name: 'Tín dụng' })).toBeNull();
    fireEvent.click(within(rail).getByRole('link', { name: 'Phân tích' }));
    expect(screen.getByTestId('destination').textContent).toBe('/hub/toi');
    const drawer = document.querySelector('#app-sidebar')!;
    expect(drawer.textContent).not.toContain('BCTC');
    expect(drawer.querySelector('a[href="/hub/cof"]')).toBeTruthy();
  });

  it('finds Hub destinations through the same command menu', () => {
    mount('/customers/55/loans', true);
    const input = screen.getByPlaceholderText('Tìm kiếm phân hệ, hợp đồng, khoản vay...');
    fireEvent.change(input, { target: { value: 'bctc' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('destination').textContent).toBe('/hub/corporate-financial');
  });

  it('command menu preserves the selected customer for record destinations', () => {
    mount('/customers/55/loans', true);
    const input = screen.getByPlaceholderText('Tìm kiếm phân hệ, hợp đồng, khoản vay...');
    fireEvent.change(input, { target: { value: 'hợp đồng thế chấp' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTestId('destination').textContent).toBe('/customers/55/mortgage-contracts');
  });

  it('opens navigation over a dedicated workspace without replacing its content', () => {
    render(<MemoryRouter initialEntries={['/dispatches']}><LanguageProvider><DedicatedWorkspaceHeader /><section data-testid="dispatch-content">Văn thư hiện tại</section></LanguageProvider></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu chức năng' }));
    expect(screen.getByRole('link', { name: 'Danh sách khách hàng' })).toBeTruthy();
    expect(screen.getByTestId('dispatch-content').textContent).toBe('Văn thư hiện tại');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.querySelector('#app-sidebar')).toBeNull();
  });
});
