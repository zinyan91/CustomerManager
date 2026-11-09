// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DispatchDocument } from '../../types/dispatch';

vi.mock('../../lib/dispatch/dispatchStorage', () => ({
  resolveFileDownloadUrl: vi.fn(async () => 'blob:tep-gia'),
}));

import { DispatchPreviewModal } from '../dispatch/DispatchPreviewModal';

afterEach(cleanup);

const doc = (fileName: string, fileType: string): DispatchDocument => ({
  id: 'd1', documentNumber: 'X', title: fileName, documentType: 'khac', issuer: 'Kho lưu trữ', documentDate: '', receivedDate: '',
  customerId: null, fileName, fileSize: 2048, fileType, fileUrl: '', storageProvider: 'drive', createdAt: '', updatedAt: '',
});

function mo(d: DispatchDocument) {
  return render(<DispatchPreviewModal document={d} isOpen onClose={() => {}} onOpenAiChat={() => {}} />);
}

describe('DispatchPreviewModal theo loại tệp', () => {
  it('ảnh gif hiện như ảnh', async () => {
    mo(doc('chup.gif', 'image/gif'));
    expect(await screen.findByRole('img')).toBeTruthy();
  });

  it.each([
    ['ho-so.zip', 'application/zip'],
    ['setup.exe', 'application/vnd.microsoft.portable-executable'],
    ['ho-so.7z', 'application/x-7z-compressed'],
  ])('%s: báo không xem trước được, có nút tải, không có AI', async (name, mime) => {
    mo(doc(name, mime));
    expect(await screen.findByText('Định dạng này không xem trước được. Hãy tải tệp về để mở trên máy tính.')).toBeTruthy();
    expect(screen.queryByText('Hỏi đáp AI')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Tải/ }).length).toBeGreaterThan(0);
  });

  it('tài liệu Word có hỏi đáp AI', async () => {
    mo(doc('to-trinh.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
    expect(await screen.findByText('Hỏi đáp AI')).toBeTruthy();
  });

  it('không còn cột thông tin hành chính hay tóm tắt dựa trên tên tệp; tiêu đề phụ chỉ nêu cái có thật', async () => {
    mo({ ...doc('bao-cao.pdf', 'application/pdf'), documentNumber: '' });
    expect(await screen.findByTitle('Bản xem trước PDF')).toBeTruthy();
    expect(screen.queryByText('Thông tin hành chính')).toBeNull();
    expect(screen.queryByText('Cơ quan ban hành')).toBeNull();
    expect(screen.queryByText(/Không có số/)).toBeNull();
    expect(screen.getByText('bao-cao.pdf • 2.00 KB')).toBeTruthy();
  });

  it('có số hiệu thì hiện số hiệu; Esc hoặc bấm nền tối để đóng', async () => {
    const onClose = vi.fn();
    const { container } = render(<DispatchPreviewModal document={doc('qd.pdf', 'application/pdf')} isOpen onClose={onClose} />);
    expect(await screen.findByText('Số: X • qd.pdf • 2.00 KB')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(container.firstChild as Element);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
