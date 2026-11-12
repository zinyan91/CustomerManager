// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { LanguageProvider } from '../../context/LanguageContext';
import { SidebarCollapseProvider } from '../../context/SidebarCollapseContext';
import { PrimaryRail } from '../PrimaryRail';
import { MODULE_IDS } from '../../lib/modules';
import { visibleWorkspaceSections } from '../../lib/workspaceNavigation';

vi.mock('../../context/ModulesContext', async () => {
  const { MODULE_IDS } = await import('../../lib/modules');
  return { useModules: () => ({ allowed: MODULE_IDS, ready: true, error: null }) };
});

function Where() {
  return <output data-testid="where">{useLocation().pathname}</output>;
}
const mount = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <LanguageProvider><SidebarCollapseProvider><PrimaryRail isMasterAdmin /><Where /></SidebarCollapseProvider></LanguageProvider>
  </MemoryRouter>,
);
afterEach(() => { cleanup(); vi.useRealTimers(); });

const sections = visibleWorkspaceSections(MODULE_IDS, true);
const multi = sections.find(s => s.items.length > 2)!;
const single = sections.find(s => s.items.length === 1);
const rail = () => within(screen.getByRole('navigation', { name: 'Phân hệ' }));
const sectionLink = (label: string) => rail().getByRole('link', { name: label });

describe('Thanh phân hệ thu gọn — tab phụ', () => {
  it('rê chuột vào phân hệ thì hiện các tab phụ; bấm tab thì chuyển trang và đóng', () => {
    mount();
    expect(screen.queryByRole('region', { name: `Tab phụ ${multi.label}` })).toBeNull();
    const head = sectionLink(multi.label);
    fireEvent.mouseEnter(head.parentElement!);
    const panel = within(screen.getByRole('region', { name: `Tab phụ ${multi.label}` }));
    const links = panel.getAllByRole('link');
    expect(links).toHaveLength(multi.items.length);
    expect(head.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(links[1]);
    expect(screen.getByTestId('where').textContent).toBe(links[1].getAttribute('href'));
    expect(screen.queryByRole('region', { name: `Tab phụ ${multi.label}` })).toBeNull();
  });

  it('rời chuột thì đóng sau một nhịp ngắn, đi vào bảng thì giữ mở', () => {
    vi.useFakeTimers();
    mount();
    const wrapper = sectionLink(multi.label).parentElement!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    fireEvent.mouseEnter(screen.getByRole('region', { name: `Tab phụ ${multi.label}` }).parentElement!);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByRole('region', { name: `Tab phụ ${multi.label}` })).toBeTruthy();
    fireEvent.mouseLeave(wrapper);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryByRole('region', { name: `Tab phụ ${multi.label}` })).toBeNull();
  });

  it('dùng bàn phím: Tab vào phân hệ mở bảng, Esc đóng', () => {
    mount();
    const head = sectionLink(multi.label);
    fireEvent.focus(head);
    expect(screen.getByRole('region', { name: `Tab phụ ${multi.label}` })).toBeTruthy();
    fireEvent.keyDown(head, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: `Tab phụ ${multi.label}` })).toBeNull();
  });

  it('phân hệ chỉ có một tab thì không bung bảng', () => {
    if (!single) return;
    mount();
    fireEvent.mouseEnter(sectionLink(single.label).parentElement!);
    expect(screen.queryByRole('region', { name: `Tab phụ ${single.label}` })).toBeNull();
    expect(sectionLink(single.label).getAttribute('aria-haspopup')).toBeNull();
  });
});
