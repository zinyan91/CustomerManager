// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Sidebar } from '../Sidebar';
import { LanguageProvider } from '../../context/LanguageContext';
import { translate } from '../../lib/i18n';

afterEach(cleanup);

function dungLen() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <Sidebar activeTab="dashboard" setActiveTab={() => {}} />
      </LanguageProvider>
    </MemoryRouter>
  );
}

const NHAN_MUC = [
  'Tổng quan',
  'Danh sách khách hàng',
  'Hợp đồng tín dụng',
  'Quản lý khoản vay (KUNN)',
  'Định giá TSĐB',
  'Thẻ tín dụng',
  'Công cụ tính toán',
  'Phương án kinh doanh',
  'Hàng tồn kho',
  'Bảng kê mua bán',
  'Hóa đơn bán lẻ',
  'Chào lãi suất',
  'Mua bán vốn nội bộ',
  'Tra cứu mục đích SDV',
  'Tra cứu chính sách thẻ',
  'Soạn biểu mẫu HĐ',
  'Ôn tập nghiệp vụ',
  'Kiểm soát sau vay',
  'Cấu hình & cài đặt',
];

const NHAN_NHOM = [
  'Tổng quan',
  'Hồ sơ tín dụng',
  'Công cụ & Phương án',
  'Tra cứu & Biểu mẫu',
  'Kiểm soát',
];

describe('Sidebar đọc danh sách màn từ navigation.ts', () => {
  it('hiện đủ 19 mục, mỗi mục một nút', () => {
    dungLen();
    expect(NHAN_MUC).toHaveLength(19);
    for (const nhan of NHAN_MUC) {
      expect(screen.getAllByText(nhan).length, `thiếu mục "${nhan}"`).toBeGreaterThan(0);
    }
  });

  it('dựng đúng 19 nút trong nav', () => {
    const { container } = dungLen();
    expect(container.querySelectorAll('nav button').length).toBe(19);
  });

  it('hiện đủ 5 tiêu đề nhóm', () => {
    dungLen();
    expect(NHAN_NHOM).toHaveLength(5);
    for (const nhan of NHAN_NHOM) {
      expect(screen.getAllByText(nhan).length).toBeGreaterThan(0);
    }
  });

  it('mục đang mở được đánh dấu aria-current', () => {
    dungLen();
    const nut = screen
      .getAllByText(translate('vi', 'nav.dashboard'))
      .map(el => el.closest('button'))
      .find(Boolean);
    expect(nut?.getAttribute('aria-current')).toBe('page');
  });
});
