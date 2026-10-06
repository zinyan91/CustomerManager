// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { AiChatMessage } from '../../../types/ai';
import { AiConversation } from '../AiConversation';

afterEach(cleanup);

const msgs = (fromCache?: boolean): AiChatMessage[] => [
  { id: 'u1', role: 'user', content: 'lãi suất ngắn hạn', createdAt: '2026-10-07T01:00:00Z' },
  { id: 'a1', role: 'assistant', content: 'Đáp án', createdAt: '2026-10-07T01:00:01Z', fromCache },
];

const base = { isStreaming: false, streamingText: '', onSelectPrompt: () => {} };

describe('AiConversation - câu trả lời dùng chung', () => {
  it('câu trả lời lấy từ bộ nhớ dùng chung có ghi chú và nút Hỏi lại AI', () => {
    const onRefresh = vi.fn();
    render(<AiConversation {...base} messages={msgs(true)} onRefreshAnswer={onRefresh} />);
    expect(screen.getByText('Câu trả lời đã có từ trước (dùng chung)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hỏi lại AI' }));
    expect(onRefresh).toHaveBeenCalledWith('a1');
  });

  it('câu trả lời mới của AI không có ghi chú dùng chung', () => {
    render(<AiConversation {...base} messages={msgs(false)} onRefreshAnswer={() => {}} />);
    expect(screen.queryByText(/dùng chung/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hỏi lại AI' })).toBeNull();
  });
});

describe('AiConversation - cuộn tới nội dung mới ở cuối', () => {
  it('đổi scrollKey (thẻ đề xuất xuất hiện hoặc đổi trạng thái) thì cuộn xuống cuối', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const fixed = msgs();
    const { rerender } = render(<AiConversation {...base} messages={fixed} scrollKey="" />);
    const before = scroll.mock.calls.length;
    rerender(<AiConversation {...base} messages={fixed} scrollKey="prop_1:reading" />);
    expect(scroll.mock.calls.length).toBe(before + 1);
    rerender(<AiConversation {...base} messages={fixed} scrollKey="prop_1:reading" />);
    expect(scroll.mock.calls.length).toBe(before + 1);
    rerender(<AiConversation {...base} messages={fixed} scrollKey="prop_1:ready" />);
    expect(scroll.mock.calls.length).toBe(before + 2);
  });
});
