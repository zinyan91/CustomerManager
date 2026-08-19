// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { LanguageProvider } from '../../context/LanguageContext';
import { NAV_ITEMS, NAV_GROUPS } from '../../lib/navigation';
import { translate } from '../../lib/i18n';

afterEach(cleanup);

function dungLen() {
  return render(
    <LanguageProvider>
      <Sidebar activeTab="dashboard" setActiveTab={() => {}} />
    </LanguageProvider>
  );
}

describe('Sidebar đọc danh sách màn từ navigation.ts', () => {
  it('hiện đủ 19 mục, mỗi mục một nút', () => {
    dungLen();
    for (const item of NAV_ITEMS) {
      expect(
        screen.getAllByText(translate('vi', item.labelKey)).length,
        `thiếu mục ${item.id}`
      ).toBeGreaterThan(0);
    }
  });

  it('hiện đủ 5 tiêu đề nhóm', () => {
    dungLen();
    const nhom = [...new Set(NAV_GROUPS.map(g => g.groupKey))];
    expect(nhom).toHaveLength(5);
    for (const key of nhom) {
      expect(screen.getAllByText(translate('vi', key)).length).toBeGreaterThan(0);
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
