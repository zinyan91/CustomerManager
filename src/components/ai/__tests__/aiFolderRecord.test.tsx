// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  send: vi.fn(),
  extract: vi.fn(),
  target: vi.fn(),
  record: vi.fn(),
  findForms: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test' }, can: () => false }),
}));
vi.mock('../../../hooks/useAiAssistant', () => ({
  useAiAssistant: () => ({
    threads: [], activeThreadId: null, messages: [], isStreaming: false, streamingText: '', attachedDoc: null,
    model: 'gemini-test', error: null, setModel: vi.fn(), setAttachedDoc: vi.fn(), sendMessage: m.send,
    stopStreaming: vi.fn(), clearMessages: vi.fn(), createNewThread: vi.fn(), selectThread: vi.fn(),
    deleteThread: vi.fn(), askAboutDocument: vi.fn(),
  }),
}));
vi.mock('../../../lib/ai/docExtract', () => ({ extractOfficialDocFields: m.extract }));
vi.mock('../../../lib/officialDoc/recordFromAi', () => ({
  attachmentToFile: (att: { name: string }) => new File(['x'], att.name, { type: 'application/pdf' }),
  resolveRecordTarget: m.target,
  recordDocFromFile: m.record,
  findFormFiles: m.findForms,
}));

import { AiChatDialog } from '../AiChatDialog';

const PLACEHOLDER = 'Nhập câu hỏi hoặc kéo thả tệp vào đây...';
const FIELDS = {
  category: 'van-ban', docNumber: '2097/2026/TB-TGĐ', title: 'Triển khai vận hành tín dụng tập trung',
  issuedDate: '2026-06-30', effectiveFrom: '2026-06-30', effectiveTo: null,
};
const textarea = () => screen.getByPlaceholderText(PLACEHOLDER);

beforeEach(() => {
  m.send.mockReset().mockResolvedValue(undefined);
  m.extract.mockReset().mockResolvedValue(FIELDS);
  m.target.mockReset().mockResolvedValue({ repo: { id: 1 }, token: 't' });
  m.record.mockReset().mockResolvedValue({ id: '9' });
  m.findForms.mockReset().mockResolvedValue({ files: [], note: null });
});
afterEach(cleanup);

const pdf = (name: string) => new File(['%PDF-1.4'], name, { type: 'application/pdf' });
const docx = (name: string) => new File(['PK'], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

const REAL_NAMES = [
  'PL6 - 2097-2026-TB-TGĐ.pdf', 'BM - 2097-2026-TB-TGĐ.pdf', '2097-2026-TB-TGĐ.pdf', 'PL1 - 2097-2026-TB-TGĐ.pdf', 'PL2 - 2097-2026-TB-TGĐ.pdf',
  'PL3 - 2097-2026-TB-TGĐ.pdf', 'PL4 - 2097-2026-TB-TGĐ.pdf', 'PL5 - 2097-2026-TB-TGĐ.pdf',
];

// Mục thả của trình duyệt: thư mục (entry API) hoặc tệp rời
function fileEntry(file: File) {
  return { isFile: true, isDirectory: false, name: file.name, file: (ok: (f: File) => void) => ok(file) };
}
function dirEntry(name: string, children: unknown[]) {
  let served = false;
  return {
    isFile: false, isDirectory: true, name,
    createReader: () => ({
      readEntries: (ok: (e: unknown[]) => void) => {
        ok(served ? [] : children);
        served = true;
      },
    }),
  };
}
const item = (entry: unknown) => ({ kind: 'file', webkitGetAsEntry: () => entry, getAsFile: () => null });
const dropEntries = (...entries: unknown[]) =>
  fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], items: entries.map(item), files: [] } });
const dropFolder = (name: string, files: File[]) => dropEntries(dirEntry(name, files.map(fileEntry)));

const openDialog = (canRecordDocs = true) => render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={canRecordDocs} />);
const intentGroup = () => screen.getByRole('group', { name: 'Chọn việc cần làm với tệp' });

describe('Chat AI - thả cả thư mục văn thư', () => {
  it('một thư mục thành một văn bản: tệp chính để AI đọc, 7 phụ lục chỉ lưu; chỉ còn việc Thêm văn bản mới', async () => {
    openDialog();
    dropFolder('2093-2026-tb-tgd', REAL_NAMES.map(pdf));

    expect(await screen.findByText('2093-2026-tb-tgd')).toBeTruthy();
    expect(screen.getByText('7 phụ lục')).toBeTruthy();
    const main = (screen.getByLabelText('Tệp văn bản chính') as HTMLSelectElement);
    expect(main.options[main.selectedIndex].text).toBe('2097-2026-TB-TGĐ.pdf');
    expect(within(intentGroup()).getAllByRole('button').map((b) => b.textContent)).toEqual(['Thêm văn bản mới']);
  });

  it('Thêm văn bản mới: AI chỉ đọc đúng tệp chính; thẻ liệt kê phụ lục theo thứ tự tự nhiên', async () => {
    openDialog();
    dropFolder('VB', REAL_NAMES.map(pdf));
    await screen.findByText('7 phụ lục');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm văn bản mới' }));

    await waitFor(() => expect(m.extract).toHaveBeenCalledTimes(1));
    expect(m.extract.mock.calls[0][0]).toMatchObject({ name: '2097-2026-TB-TGĐ.pdf' });
    expect(m.send).not.toHaveBeenCalled();

    const heading = await screen.findByText('Phụ lục (7)');
    const names = [...(heading.parentElement as HTMLElement).querySelectorAll('li span.truncate')].map((s) => s.textContent);
    expect(names).toEqual([
      'BM - 2097-2026-TB-TGĐ.pdf', 'PL1 - 2097-2026-TB-TGĐ.pdf', 'PL2 - 2097-2026-TB-TGĐ.pdf', 'PL3 - 2097-2026-TB-TGĐ.pdf',
      'PL4 - 2097-2026-TB-TGĐ.pdf', 'PL5 - 2097-2026-TB-TGĐ.pdf', 'PL6 - 2097-2026-TB-TGĐ.pdf',
    ]);
    expect(screen.queryByRole('group', { name: 'Chọn việc cần làm với tệp' })).toBeNull();
  });

  it('bấm Ghi nhận: gửi tệp chính cùng 7 phụ lục để tải vào cùng thư mục văn bản', async () => {
    openDialog();
    dropFolder('VB', REAL_NAMES.map(pdf));
    await screen.findByText('7 phụ lục');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm văn bản mới' }));
    const number = (await screen.findByLabelText('Số hiệu')) as HTMLInputElement;
    await waitFor(() => expect(number.value).not.toBe(''));

    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }));
    expect(await screen.findByText('Đã ghi nhận vào Văn thư')).toBeTruthy();
    const arg = m.record.mock.calls[0][0];
    expect(arg.file.name).toBe('2097-2026-TB-TGĐ.pdf');
    expect(arg.appendices).toHaveLength(7);
    expect(arg.appendices.map((f: File) => f.name)[0]).toBe('BM - 2097-2026-TB-TGĐ.pdf');
  });

  it('đổi tệp chính trước khi gửi: AI đọc tệp mới, tệp cũ thành phụ lục, số phụ lục không đổi', async () => {
    openDialog();
    dropFolder('VB', [pdf('2097-2026-TB-TGĐ.pdf'), pdf('Tờ trình kèm.pdf'), pdf('PL1.pdf')]);
    await screen.findByText('2 phụ lục');
    const select = screen.getByLabelText('Tệp văn bản chính') as HTMLSelectElement;
    const index = [...select.options].findIndex((o) => o.text === 'Tờ trình kèm.pdf');
    fireEvent.change(select, { target: { value: String(index) } });

    await waitFor(() => expect((screen.getByLabelText('Tệp văn bản chính') as HTMLSelectElement).options[(screen.getByLabelText('Tệp văn bản chính') as HTMLSelectElement).selectedIndex].text).toBe('Tờ trình kèm.pdf'));
    expect(screen.getByText('2 phụ lục')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thêm văn bản mới' }));
    await waitFor(() => expect(m.extract).toHaveBeenCalledTimes(1));
    expect(m.extract.mock.calls[0][0]).toMatchObject({ name: 'Tờ trình kèm.pdf' });
  });

  it('Word, Excel, ZIP trong thư mục thành biểu mẫu đi kèm, không phải phụ lục', async () => {
    openDialog();
    dropFolder('VB', [pdf('2097-2026-TB-TGĐ.pdf'), pdf('PL1.pdf'), docx('mau-01.docx')]);
    await screen.findByText('1 phụ lục');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm văn bản mới' }));
    await screen.findByText('Phụ lục (1)');
    const number = (await screen.findByLabelText('Số hiệu')) as HTMLInputElement;
    await waitFor(() => expect(number.value).not.toBe(''));
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }));
    await screen.findByText('Đã ghi nhận vào Văn thư');
    const arg = m.record.mock.calls[0][0];
    expect(arg.appendices.map((f: File) => f.name)).toEqual(['PL1.pdf']);
    expect(arg.formUploads.map((f: File) => f.name)).toEqual(['mau-01.docx']);
  });

  it('thư mục không có PDF hay ảnh: báo lỗi rõ, không đính kèm gì', async () => {
    openDialog();
    dropFolder('Mau', [docx('a.docx')]);
    expect((await screen.findByRole('alert')).textContent).toContain('không có PDF hoặc ảnh để làm văn bản chính');
    expect(screen.queryByText('Mau')).toBeNull();
  });

  it('thả hai thư mục một lúc: báo lỗi, không lấy thư mục nào', async () => {
    openDialog();
    dropEntries(dirEntry('A', [fileEntry(pdf('1-2026-a.pdf'))]), dirEntry('B', [fileEntry(pdf('2-2026-b.pdf'))]));
    expect((await screen.findByRole('alert')).textContent).toContain('Mỗi lần chỉ thêm một thư mục văn thư');
    expect(screen.queryByText('A')).toBeNull();
  });

  it('đã có văn bản đính kèm thì không thêm thư mục chồng lên', async () => {
    openDialog();
    dropFolder('VB', [pdf('1-2026-a.pdf')]);
    await screen.findByText('0 phụ lục');
    dropFolder('VB2', [pdf('2-2026-b.pdf')]);
    expect((await screen.findByRole('alert')).textContent).toContain('Gỡ văn bản đang đính kèm');
  });

  it('gỡ thư mục thì gỡ luôn tệp chính đang đính kèm', async () => {
    openDialog();
    dropFolder('VB', [pdf('2097-2026-TB-TGĐ.pdf'), pdf('PL1.pdf')]);
    await screen.findByText('1 phụ lục');
    fireEvent.click(screen.getByTitle('Gỡ thư mục'));
    expect(screen.queryByText('VB')).toBeNull();
    expect(screen.queryByText('2097-2026-TB-TGĐ.pdf')).toBeNull();
  });

  it('gỡ tệp chính thì thư mục cũng bị gỡ, không còn phụ lục mồ côi', async () => {
    openDialog();
    dropFolder('VB', [pdf('2097-2026-TB-TGĐ.pdf'), pdf('PL1.pdf')]);
    await screen.findByText('1 phụ lục');
    const chip = screen.getAllByText('2097-2026-TB-TGĐ.pdf').map((el) => el.closest('div.group')).find(Boolean) as HTMLElement;
    fireEvent.click(within(chip).getByRole('button'));
    expect(screen.queryByText('1 phụ lục')).toBeNull();
  });

  it('tài khoản không được thêm văn bản: thư mục không thành văn bản, từng tệp đính kèm như trước', async () => {
    openDialog(false);
    dropFolder('VB', [pdf('a.pdf'), pdf('b.pdf')]);
    expect(await screen.findByText('a.pdf')).toBeTruthy();
    expect(screen.getByText('b.pdf')).toBeTruthy();
    expect(screen.queryByLabelText('Tệp văn bản chính')).toBeNull();
    expect(screen.queryByText(/phụ lục/)).toBeNull();
  });

  it('chọn thư mục bằng nút đính kèm thư mục cũng thành một văn bản', async () => {
    openDialog();
    const withPath = (name: string, path: string) => Object.defineProperty(pdf(name), 'webkitRelativePath', { value: path });
    fireEvent.change(screen.getByLabelText('Chọn thư mục văn thư để thêm'), {
      target: { files: [withPath('2097-2026-TB-TGĐ.pdf', 'VB/2097-2026-TB-TGĐ.pdf'), withPath('PL1.pdf', 'VB/PL1.pdf')] },
    });
    expect(await screen.findByText('1 phụ lục')).toBeTruthy();
    expect(screen.getByText('VB')).toBeTruthy();
  });

  it('tài khoản không được thêm văn bản không thấy nút chọn thư mục', () => {
    openDialog(false);
    expect(screen.queryByLabelText('Chọn thư mục văn thư để thêm')).toBeNull();
  });
});
