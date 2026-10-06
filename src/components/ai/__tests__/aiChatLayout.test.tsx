// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-test' }, can: () => false }) }));

vi.mock('../../../hooks/useAiAssistant', () => ({
  useAiAssistant: () => ({
    threads: [], activeThreadId: null, messages: [], isStreaming: false, streamingText: '', statusText: '', attachedDoc: null,
    model: 'gemini-test', error: null, setModel: vi.fn(), setAttachedDoc: vi.fn(), sendMessage: vi.fn(),
    stopStreaming: vi.fn(), clearMessages: vi.fn(), createNewThread: vi.fn(), selectThread: vi.fn(),
    deleteThread: vi.fn(), askAboutDocument: vi.fn(),
  }),
}));

import { AiChatDialog } from '../AiChatDialog';
import { AiMarkdownMessage } from '../AiMarkdownMessage';

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'innerWidth', { value: 1600, configurable: true });
});
afterEach(cleanup);

const aside = () => screen.getByRole('complementary', { name: /Trợ lý AI/ });
const handle = () => screen.getByRole('separator', { name: /độ rộng khung chat/ });

describe('Khung chat AI - đổi độ rộng', () => {
  it('mở với độ rộng mặc định và có thanh kéo ở mép', () => {
    render(<AiChatDialog isOpen onClose={() => {}} mode="sidebar" />);
    expect(aside().style.width).toBe('480px');
    expect(handle().getAttribute('aria-valuenow')).toBe('480');
  });

  it('kéo thanh sang trái làm khung rộng ra và nhớ cho lần mở sau', () => {
    const first = render(<AiChatDialog isOpen onClose={() => {}} mode="sidebar" />);
    fireEvent.pointerDown(handle(), { clientX: 1100, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientX: 800, pointerId: 1 });
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(aside().style.width).toBe('780px');

    first.unmount();
    render(<AiChatDialog isOpen onClose={() => {}} mode="sidebar" />);
    expect(aside().style.width).toBe('780px');
  });

  it('nhấp đúp thanh kéo trả về độ rộng mặc định', () => {
    localStorage.setItem('cm_ai_chat_width', '900');
    render(<AiChatDialog isOpen onClose={() => {}} mode="sidebar" />);
    expect(aside().style.width).toBe('900px');
    fireEvent.doubleClick(handle());
    expect(aside().style.width).toBe('480px');
  });

  it('nút Phóng to đưa tới 800px, bấm lại thì về mặc định', () => {
    render(<AiChatDialog isOpen onClose={() => {}} mode="sidebar" />);
    fireEvent.click(screen.getByTitle('Phóng to'));
    expect(aside().style.width).toBe('800px');
    fireEvent.click(screen.getByTitle('Thu nhỏ'));
    expect(aside().style.width).toBe('480px');
  });

  it('chế độ drawer cũng dùng cùng độ rộng và thanh kéo', () => {
    localStorage.setItem('cm_ai_chat_width', '640');
    const { container } = render(<AiChatDialog isOpen onClose={() => {}} mode="drawer" />);
    expect((container.querySelector('.pointer-events-auto') as HTMLElement).style.width).toBe('640px');
    expect(handle()).toBeTruthy();
  });
});

describe('Bảng markdown trong chat', () => {
  it('chữ **đậm** trong ô bảng được hiển thị đậm, không lộ dấu **', () => {
    const md = '| Quy mô | Lãi suất |\n| --- | --- |\n| **Quy mô KH < 200 triệu** | 9.00%/năm |';
    const { container } = render(<AiMarkdownMessage content={md} />);
    expect(container.textContent).not.toContain('**');
    expect(container.querySelector('td strong')?.textContent).toBe('Quy mô KH < 200 triệu');
  });
});
