// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
    expect(screen.queryByText('AI Tóm tắt văn bản')).toBeNull();
    expect(screen.queryByText('Hỏi đáp AI')).toBeNull();
    expect(screen.getAllByRole('button', { name: /Tải/ }).length).toBeGreaterThan(0);
  });

  it('tài liệu Word vẫn có AI tóm tắt và hỏi đáp', async () => {
    mo(doc('to-trinh.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
    expect(await screen.findByText('AI Tóm tắt văn bản')).toBeTruthy();
    expect(screen.getByText('Hỏi đáp AI')).toBeTruthy();
  });
});
