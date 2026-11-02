//@vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { Sidebar } from '../Sidebar';
import { LanguageProvider } from '../../context/LanguageContext';
import { translate } from '../../lib/i18n';

const modulesState = vi.hoisted(() => ({ allowed: null as string[] | null }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ can: () => false }) }));
vi.mock('../../context/ModulesContext', async () => {
  const { MODULE_IDS } = await import('../../lib/modules');
  return { useModules: () => ({ allowed: modulesState.allowed ?? [...MODULE_IDS], ready: true, error: null, reload: () => {} }) };
});

afterEach(() => {
  modulesState.allowed = null;
  cleanup();
});

function dungLen(duongDan = '/dashboard', isMasterAdmin = false) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <LanguageProvider>
        <Routes>
          <Route path="*" element={<Sidebar isMasterAdmin={isMasterAdmin} />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>
  );
}

const hrefs = (container: HTMLElement) => [...container.querySelectorAll('nav a')].map(a => a.getAttribute('href'));
const phanHe = (nhan: string) => screen.getByRole('button', { name: nhan });

describe('Sidebar gom phân hệ và màn con vào một cây', () => {
  it('phân hệ nhiều màn là nút mở/đóng, phân hệ một màn là liên kết thẳng', () => {
    dungLen();
    for (const nhan of ['Tổng quan', 'Tín dụng', 'Phân tích', 'Dự toán', 'Tra cứu']) {
      expect(phanHe(nhan).getAttribute('aria-expanded'), nhan).not.toBeNull();
    }
    for (const [nhan, href] of [['Hồ sơ chứng từ', '/hub/documents'], ['Quản lý văn thư', '/dispatches'], ['Kho lưu trữ', '/storage'], ['Cài đặt', '/settings']]) {
      expect(screen.getByRole('link', { name: nhan }).getAttribute('href'), nhan).toBe(href);
    }
  });

  it('chỉ mở phân hệ chứa màn hiện tại', () => {
    const { container } = dungLen('/customers');
    expect(phanHe('Tín dụng').getAttribute('aria-expanded')).toBe('true');
    expect(phanHe('Tổng quan').getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelectorAll('[role="group"]')).toHaveLength(1);
    const tinDung = within(screen.getByRole('group', { name: 'Tín dụng' }));
    expect(tinDung.getByRole('link', { name: translate('vi', 'nav.customers') }).getAttribute('aria-current')).toBe('page');
  });

  it('mở phân hệ khác thì đóng phân hệ đang mở, bấm lại thì đóng', () => {
    dungLen('/customers');
    fireEvent.click(phanHe('Tra cứu'));
    expect(screen.queryByRole('group', { name: 'Tín dụng' })).toBeNull();
    expect(within(screen.getByRole('group', { name: 'Tra cứu' })).getAllByRole('link').map(a => a.getAttribute('href')))
      .toEqual(['/hub/mdsdv', '/hub/card-fees', '/tools/rate-quote', '/hub/cof', '/hub/quiz']);
    fireEvent.click(phanHe('Tra cứu'));
    expect(screen.queryByRole('group')).toBeNull();
    expect(phanHe('Tra cứu').getAttribute('aria-expanded')).toBe('false');
  });

  it('phân hệ đang đóng vẫn đánh dấu là nơi chứa màn hiện tại', () => {
    dungLen('/customers');
    fireEvent.click(phanHe('Tín dụng'));
    expect(phanHe('Tín dụng').className).toContain('font-semibold');
    expect(phanHe('Tổng quan').className).not.toContain('font-semibold');
  });

  it('chỉ hiện Quản trị cho quản trị viên', () => {
    dungLen('/dashboard', false);
    expect(screen.queryByRole('button', { name: 'Quản trị' })).toBeNull();
    cleanup();
    dungLen('/dashboard', true);
    fireEvent.click(phanHe('Quản trị'));
    const admin = within(screen.getByRole('group', { name: 'Quản trị' })).getByRole('link', { name: 'Tổng quan' });
    expect(admin.getAttribute('href')).toBe('/admin');
    expect(admin.getAttribute('target')).toBeNull();
  });

  it('mục ứng với đường dẫn hiện tại được đánh dấu aria-current', () => {
    const { container } = dungLen('/settings');
    const dangMo = container.querySelectorAll('[aria-current="page"]');
    expect(dangMo).toHaveLength(1);
    expect(dangMo[0].getAttribute('href')).toBe('/settings');
  });
});

describe('Sidebar giữ ngữ cảnh khách hàng', () => {
  it('đang có khách thì mục màn hồ sơ trỏ tới đường lồng', () => {
    const { container } = dungLen('/customers/55/loans');
    expect(container.querySelector('a[href="/customers/55/collaterals"]')).toBeTruthy();
  });

  it('đang có khách thì mục ngoài phạm vi khách vẫn trỏ đường phẳng', () => {
    const { container } = dungLen('/customers/55/loans');
    fireEvent.click(phanHe('Phân tích'));
    expect(container.querySelector('a[href="/tools/calculators"]')).toBeTruthy();
    expect(container.querySelector('a[href="/settings"]')).toBeTruthy();
  });

  it('chưa có khách thì mọi mục trỏ đường phẳng', () => {
    const { container } = dungLen('/loans');
    expect(container.querySelector('a[href="/collaterals"]')).toBeTruthy();
    expect(container.querySelector('a[href^="/customers/"]')).toBeNull();
  });

  it('ở đường lồng thì mục sáng là màn đó, không phải mục Khách hàng', () => {
    const { container } = dungLen('/customers/55/loans');
    const dangMo = container.querySelectorAll('[aria-current="page"]');
    expect(dangMo.length).toBe(1);
    expect(dangMo[0].getAttribute('href')).toBe('/customers/55/loans');
  });

  it('ở /customers thì mục Khách hàng sáng', () => {
    const { container } = dungLen('/customers');
    const dangMo = container.querySelectorAll('[aria-current="page"]');
    expect(dangMo.length).toBe(1);
    expect(dangMo[0].getAttribute('href')).toBe('/customers');
  });
});

describe('Sidebar mobile drawer behavior', () => {
  function drawer(onClose: () => void) {
    return render(
      <MemoryRouter>
        <LanguageProvider>
          <Sidebar isOpenMobile={true} onCloseMobile={onClose} />
        </LanguageProvider>
      </MemoryRouter>
    );
  }

  it('renders mobile header, close button and backdrop when isOpenMobile=true', () => {
    const onClose = vi.fn();
    drawer(onClose);
    expect(screen.getByText('Menu Hệ Thống')).toBeTruthy();
    fireEvent.click(screen.getByLabelText(translate('vi', 'header.closeMenu')));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking backdrop calls onCloseMobile', () => {
    const onClose = vi.fn();
    const { container } = drawer(onClose);
    fireEvent.click(container.querySelector('div[aria-hidden="true"]')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pressing Escape calls onCloseMobile', () => {
    const onClose = vi.fn();
    drawer(onClose);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking a link calls onCloseMobile, opening a section does not', () => {
    const onClose = vi.fn();
    const { container } = drawer(onClose);
    fireEvent.click(phanHe('Tín dụng'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(container.querySelector('nav a')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Sidebar lọc theo module của tài khoản', () => {
  it('tài khoản chỉ có Văn thư chỉ thấy Văn thư và Cài đặt', () => {
    modulesState.allowed = ['dispatch'];
    const { container } = dungLen('/settings');
    expect(hrefs(container)).toEqual(['/dispatches', '/settings']);
    expect(container.querySelectorAll('nav button')).toHaveLength(0);
  });

  it('phân hệ không còn màn nào thì bỏ cả mục lớn', () => {
    modulesState.allowed = ['dispatch'];
    dungLen('/settings');
    expect(screen.queryByRole('button', { name: 'Phân tích' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tín dụng' })).toBeNull();
  });

  it('tài khoản không có module nào chỉ còn Cài đặt', () => {
    modulesState.allowed = [];
    const { container } = dungLen('/settings');
    expect(hrefs(container)).toEqual(['/settings']);
  });
});
