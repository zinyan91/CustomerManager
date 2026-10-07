//@vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { Sidebar } from '../Sidebar';
import { LanguageProvider } from '../../context/LanguageContext';
import { translate } from '../../lib/i18n';

const modulesState = vi.hoisted(() => ({ allowed: null as string[] | null }));
vi.mock('../../context/ModulesContext', async () => {
  const { MODULE_IDS } = await import('../../lib/modules');
  return { useModules: () => ({ allowed: modulesState.allowed ?? [...MODULE_IDS], ready: true, error: null, reload: () => {} }) };
});

afterEach(() => {
  modulesState.allowed = null;
  cleanup();
});

function dungLen(canManageUsers = false) {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <Sidebar canManageUsers={canManageUsers} />
      </LanguageProvider>
    </MemoryRouter>
  );
}

const NHAN_MUC = [
  'Tổng quan',
  'Danh mục',
  'Danh sách khách hàng',
  'Hợp đồng tín dụng',
  'Quản lý khoản vay (KUNN)',
  'Định giá TSĐB',
  'Thẻ tín dụng',
  'Quản lý văn thư',
  'Kho lưu trữ',
  'Phương án kinh doanh',
  'Hàng tồn kho',
  'Công cụ tính toán',
  'Chào lãi suất',
  'Kiểm soát sau vay',
  'Cấu hình & cài đặt',
];

const NHAN_NHOM = [
  'Tổng quan',
  'Hồ sơ tín dụng',
  'Phân tích kinh doanh',
  'Công cụ tính & Lãi suất',
  'Tra cứu & Kiểm soát',
];

describe('Sidebar đọc danh sách màn từ navigation.ts', () => {
  it('hiện đủ các mục, mỗi mục một nút', () => {
    dungLen();
    expect(NHAN_MUC).toHaveLength(15);
    for (const nhan of NHAN_MUC) {
      expect(screen.getAllByText(nhan).length, `thiếu mục "${nhan}"`).toBeGreaterThan(0);
    }
  });

  it('dựng đúng 16 liên kết trong nav', () => {
    const { container } = dungLen();
    expect(container.querySelectorAll('nav a').length).toBe(16);
  });

  it('chỉ hiện mục Quản trị khi có quyền quản lý người dùng', () => {
    const { container, unmount } = dungLen(false);
    expect(container.querySelector('nav a[href="/admin"]')).toBeNull();
    unmount();
    const co = dungLen(true);
    expect(co.container.querySelectorAll('nav a').length).toBe(17);
    expect(co.container.querySelector('nav a[href="/admin"]')).toBeTruthy();
  });

  it('hiện đủ 5 tiêu đề nhóm', () => {
    dungLen();
    expect(NHAN_NHOM).toHaveLength(5);
    for (const nhan of NHAN_NHOM) {
      expect(screen.getAllByText(nhan).length, `thiếu nhóm "${nhan}"`).toBeGreaterThan(0);
    }
  });

  it('mục đang mở được đánh dấu aria-current', () => {
    render(
      <MemoryRouter initialEntries={['/customers']}>
        <LanguageProvider>
          <Sidebar />
        </LanguageProvider>
      </MemoryRouter>
    );
    const lienKet = screen
      .getAllByText(translate('vi', 'nav.customers'))
      .map(el => el.closest('a'))
      .find(Boolean);
    expect(lienKet?.getAttribute('aria-current')).toBe('page');
  });
});

describe('Sidebar dùng liên kết thật', () => {
  it('mỗi mục là một thẻ liên kết, không phải nút', () => {
    const { container } = dungLen();
    expect(container.querySelectorAll('nav a')).toHaveLength(16);
    expect(container.querySelectorAll('nav button')).toHaveLength(0);
  });

  it('liên kết trỏ đúng đường dẫn của màn', () => {
    const { container } = dungLen();
    const href = [...container.querySelectorAll('nav a')].map(a => a.getAttribute('href'));
    expect(href).toContain('/customers');
    expect(href).toContain('/settings');
  });

  it('mục ứng với đường dẫn hiện tại được đánh dấu aria-current', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <LanguageProvider>
          <Sidebar />
        </LanguageProvider>
      </MemoryRouter>
    );
    const dangMo = container.querySelector('[aria-current="page"]');
    expect(dangMo?.getAttribute('href')).toBe('/settings');
  });
});

describe('Sidebar giữ ngữ cảnh khách hàng', () => {
  function dungLenO(duongDan: string) {
    return render(
      <MemoryRouter initialEntries={[duongDan]}>
        <LanguageProvider>
          <Routes>
            <Route path="*" element={<Sidebar />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    );
  }

  it('đang có khách thì mục màn hồ sơ trỏ tới đường lồng', () => {
    const { container } = dungLenO('/customers/55/loans');
    const link = container.querySelector('a[href="/customers/55/collaterals"]');
    expect(link).toBeTruthy();
  });

  it('đang có khách thì mục ngoài phạm vi khách vẫn trỏ đường phẳng', () => {
    const { container } = dungLenO('/customers/55/loans');
    expect(container.querySelector('a[href="/tools/calculators"]')).toBeTruthy();
    expect(container.querySelector('a[href="/settings"]')).toBeTruthy();
  });

  it('chưa có khách thì mọi mục trỏ đường phẳng', () => {
    const { container } = dungLenO('/loans');
    expect(container.querySelector('a[href="/collaterals"]')).toBeTruthy();
    expect(container.querySelector('a[href^="/customers/"]')).toBeNull();
  });

  it('ở đường lồng thì mục sáng là màn đó, không phải mục Khách hàng', () => {
    const { container } = dungLenO('/customers/55/loans');
    const dangMo = container.querySelectorAll('[aria-current="page"]');
    expect(dangMo.length).toBe(1);
    expect(dangMo[0].getAttribute('href')).toBe('/customers/55/loans');
  });

  it('ở /customers thì mục Khách hàng sáng', () => {
    const { container } = dungLenO('/customers');
    const dangMo = container.querySelectorAll('[aria-current="page"]');
    expect(dangMo.length).toBe(1);
    expect(dangMo[0].getAttribute('href')).toBe('/customers');
  });
});

describe('Sidebar mobile drawer behavior', () => {
  it('renders mobile header, close button and backdrop when isOpenMobile=true', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <LanguageProvider>
          <Sidebar isOpenMobile={true} onCloseMobile={onClose} />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Menu Hệ Thống')).toBeTruthy();
    const closeBtn = screen.getByLabelText(translate('vi', 'header.closeMenu'));
    expect(closeBtn).toBeTruthy();

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking backdrop calls onCloseMobile', () => {
    const onClose = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <LanguageProvider>
          <Sidebar isOpenMobile={true} onCloseMobile={onClose} />
        </LanguageProvider>
      </MemoryRouter>
    );

    const backdrop = container.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pressing Escape calls onCloseMobile', () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <LanguageProvider>
          <Sidebar isOpenMobile={true} onCloseMobile={onClose} />
        </LanguageProvider>
      </MemoryRouter>
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking a NavLink calls onCloseMobile', () => {
    const onClose = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <LanguageProvider>
          <Sidebar isOpenMobile={true} onCloseMobile={onClose} />
        </LanguageProvider>
      </MemoryRouter>
    );

    const firstLink = container.querySelector('nav a');
    expect(firstLink).toBeTruthy();
    fireEvent.click(firstLink!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('Sidebar lọc theo module của tài khoản', () => {
  const hrefs = (container: HTMLElement) => [...container.querySelectorAll('nav a')].map(a => a.getAttribute('href'));

  it('tài khoản chỉ có Văn thư chỉ thấy Danh mục, Văn thư và Cài đặt', () => {
    modulesState.allowed = ['dispatch'];
    const { container } = dungLen();
    expect(hrefs(container)).toEqual(['/hub', '/dispatches', '/settings']);
  });

  it('nhóm không còn mục nào thì bỏ cả tiêu đề nhóm', () => {
    modulesState.allowed = ['dispatch'];
    dungLen();
    expect(screen.queryByText('Công cụ tính & Lãi suất')).toBeNull();
    expect(screen.queryByText('Phân tích kinh doanh')).toBeNull();
  });

  it('tài khoản không có module nào chỉ còn Danh mục và Cài đặt', () => {
    modulesState.allowed = [];
    const { container } = dungLen();
    expect(hrefs(container)).toEqual(['/hub', '/settings']);
  });
});
