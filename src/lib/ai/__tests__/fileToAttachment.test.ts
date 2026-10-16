import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  resolveMimeType,
  isSupportedAiAttachmentFile,
  fileToAiAttachment,
  convertFilesToAiAttachments,
} from '../fileToAttachment';

describe('fileToAttachment utils', () => {
  it('định dạng kích thước byte sang đơn vị đọc được chính xác', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(15 * 1024 * 1024)).toBe('15 MB');
  });

  it('nhận diện đúng MIME type cho hình ảnh và PDF qua tên tệp', () => {
    expect(resolveMimeType({ name: 'hop_dong.pdf' })).toBe('application/pdf');
    expect(resolveMimeType({ name: 'anh_cccd.jpg' })).toBe('image/jpeg');
    expect(resolveMimeType({ name: 'ban_do.PNG' })).toBe('image/png');
    expect(resolveMimeType({ name: 'scan.webp' })).toBe('image/webp');
  });

  it('xác định chính xác tệp được hỗ trợ hoặc không được hỗ trợ', () => {
    expect(isSupportedAiAttachmentFile({ name: 'doc.pdf' })).toBe(true);
    expect(isSupportedAiAttachmentFile({ name: 'photo.jpg' })).toBe(true);
    expect(isSupportedAiAttachmentFile({ name: 'app.exe' })).toBe(false);
    expect(isSupportedAiAttachmentFile({ name: 'data.zip' })).toBe(false);
  });

  it('đọc tệp hợp lệ và trả về AiAttachment chứa Base64', async () => {
    const mockContent = 'Mock PDF content string';
    const file = new File([mockContent], 'quy_dinh.pdf', { type: 'application/pdf' });

    const att = await fileToAiAttachment(file);
    expect(att.name).toBe('quy_dinh.pdf');
    expect(att.mimeType).toBe('application/pdf');
    expect(att.size).toBe(file.size);
    expect(att.base64Data).toBeTruthy();
    expect(att.base64Data).not.toContain('data:application/pdf;base64,');
  });

  it('chấp nhận tệp có dung lượng lớn mà không bị chặn', async () => {
    const largeFile = new File(['nội dung tệp pdf lớn'], 'sao_ke_day_du.pdf', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: 30 * 1024 * 1024 });

    const att = await fileToAiAttachment(largeFile);
    expect(att.name).toBe('sao_ke_day_du.pdf');
    expect(att.size).toBe(30 * 1024 * 1024);
  });

  it('từ chối tệp không thuộc định dạng PDF hoặc hình ảnh', async () => {
    const wordFile = new File(['mock docx'], 'taptin.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await expect(fileToAiAttachment(wordFile)).rejects.toThrow(
      /không được hỗ trợ/
    );
  });

  it('chuyển đổi danh sách nhiều tệp và gom lỗi nếu có tệp hỏng', async () => {
    const validImg = new File(['img-bytes'], 'anh.png', { type: 'image/png' });
    const invalidZip = new File(['zip-bytes'], 'tai_lieu.zip', { type: 'application/zip' });

    const result = await convertFilesToAiAttachments([validImg, invalidZip]);
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0].name).toBe('anh.png');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('tai_lieu.zip');
  });
});
