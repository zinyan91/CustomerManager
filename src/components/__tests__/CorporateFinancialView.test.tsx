// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { CorporateFinancialView } from '../views/CorporateFinancialView';
import { getActiveLiveFinancialProfile, setActiveLiveFinancialProfile } from '../../lib/ai/financialContext';

vi.mock('../ai/AiChatDialog', () => ({
  AiChatDialog: ({ isOpen, liveFinancialProfile }: { isOpen: boolean; liveFinancialProfile: any }) =>
    isOpen ? <div data-testid="ai-chat-dialog" data-company={liveFinancialProfile?.name}>AI CHAT DIALOG</div> : null,
}));

afterEach(() => {
  cleanup();
  setActiveLiveFinancialProfile(null);
  localStorage.clear();
});

describe('CorporateFinancialView AI Integration', () => {
  it('hiển thị nút Trợ lý AI trên thanh công cụ và mở AI Chat Dialog khi bấm', () => {
    render(<CorporateFinancialView />);

    const aiButton = screen.getByRole('button', { name: /Trợ lý AI/i });
    expect(aiButton).toBeTruthy();
    expect(screen.queryByTestId('ai-chat-dialog')).toBeNull();

    fireEvent.click(aiButton);
    const dialog = screen.getByTestId('ai-chat-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('data-company')).toBeTruthy();
  });

  it('đồng bộ số liệu đang sửa trực tiếp trên màn hình vào activeLiveFinancialProfile', () => {
    render(<CorporateFinancialView />);

    // Kiểm tra activeLiveProfile đã được gán tự động
    const initialProfile = getActiveLiveFinancialProfile();
    expect(initialProfile).not.toBeNull();

    // Sửa tên doanh nghiệp trên input
    const nameInput = screen.getByPlaceholderText('Nhập tên doanh nghiệp...');
    fireEvent.change(nameInput, { target: { value: 'CÔNG TY TNHH MINH PHÁT LIVE' } });

    // Profile thời gian thực phải cập nhật ngay lập tức
    const updatedProfile = getActiveLiveFinancialProfile();
    expect(updatedProfile?.name).toBe('CÔNG TY TNHH MINH PHÁT LIVE');

    // Mở AI Chat, dialog nhận đúng liveFinancialProfile
    const aiButton = screen.getByRole('button', { name: /Trợ lý AI/i });
    fireEvent.click(aiButton);

    const dialog = screen.getByTestId('ai-chat-dialog');
    expect(dialog.getAttribute('data-company')).toBe('CÔNG TY TNHH MINH PHÁT LIVE');
  });

  it('dọn dẹp activeLiveFinancialProfile về null khi rời màn hình (unmount)', () => {
    const { unmount } = render(<CorporateFinancialView />);
    expect(getActiveLiveFinancialProfile()).not.toBeNull();

    unmount();
    expect(getActiveLiveFinancialProfile()).toBeNull();
  });
});
