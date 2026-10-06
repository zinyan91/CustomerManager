// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FelixAiAvatar } from '../FelixAiAvatar';
import { AiMarkdownMessage } from '../AiMarkdownMessage';
import { AiComposer } from '../AiComposer';
import { AiChatDialog } from '../AiChatDialog';

describe('FelixAiAvatar', () => {
  it('dựng hình ảnh avatar robot ở trạng thái idle', () => {
    const { container } = render(<FelixAiAvatar status="idle" size="md" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('dựng hình ảnh avatar robot ở trạng thái thinking', () => {
    const { container } = render(<FelixAiAvatar status="thinking" size="lg" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

describe('AiMarkdownMessage', () => {
  it('hiển thị định dạng markdown tiêu đề, in đậm và danh sách', () => {
    const content = `### Quy định tín dụng\n- Tỷ lệ LTV tối đa **70%** đối với BĐS\n- Nhóm 1: Nợ đủ tiêu chuẩn`;
    render(<AiMarkdownMessage content={content} />);

    expect(screen.getByText('Quy định tín dụng')).toBeTruthy();
    expect(screen.getByText('70%')).toBeTruthy();
    expect(screen.getByText(/Nhóm 1: Nợ đủ tiêu chuẩn/)).toBeTruthy();
  });

  it('hiển thị bảng biểu markdown', () => {
    const content = `| Nhóm nợ | Tên nhóm | DPRR |\n| --- | --- | --- |\n| Nhóm 1 | Đủ tiêu chuẩn | 0% |\n| Nhóm 2 | Cần chú ý | 5% |`;
    const { container } = render(<AiMarkdownMessage content={content} />);

    expect(container.querySelector('table')).toBeTruthy();
    expect(screen.getByText('Nhóm 1')).toBeTruthy();
    expect(screen.getByText('Cần chú ý')).toBeTruthy();
  });
});

describe('AiComposer', () => {
  it('cho phép nhập và nhấn gửi tin nhắn', () => {
    const onSend = vi.fn();
    const onStop = vi.fn();
    const onRemove = vi.fn();

    render(
      <AiComposer
        onSend={onSend}
        onStop={onStop}
        isStreaming={false}
        attachedDoc={null}
        onRemoveAttachedDoc={onRemove}
      />
    );

    const textarea = screen.getByPlaceholderText(/Nhập câu hỏi nghiệp vụ/);
    fireEvent.change(textarea, { target: { value: 'Hỏi về điều kiện cấp tín dụng' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(onSend).toHaveBeenCalledWith('Hỏi về điều kiện cấp tín dụng');
  });

  it('khi đang stream thì hiện nút dừng', () => {
    const onSend = vi.fn();
    const onStop = vi.fn();
    const onRemove = vi.fn();

    render(
      <AiComposer
        onSend={onSend}
        onStop={onStop}
        isStreaming={true}
        attachedDoc={null}
        onRemoveAttachedDoc={onRemove}
      />
    );

    const stopButton = screen.getByTitle('Dừng phản hồi');
    expect(stopButton).toBeTruthy();
    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalled();
  });
});

describe('AiChatDialog - Right Drawer Panel', () => {
  it('dựng tab chat cạnh phải màn hình khi isOpen=true', () => {
    const onClose = vi.fn();
    const { container } = render(
      <AiChatDialog
        isOpen={true}
        onClose={onClose}
      />
    );

    const drawerWrapper = container.querySelector('.fixed.inset-y-0.right-0');
    expect(drawerWrapper).toBeTruthy();
    expect(screen.getByText('Trợ Lý AI Tín Dụng & Văn Thư')).toBeTruthy();

    const closeButton = screen.getByTitle('Đóng cửa sổ');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
