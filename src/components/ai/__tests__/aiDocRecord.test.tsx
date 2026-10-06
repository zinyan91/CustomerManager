// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  canUpload: false,
  send: vi.fn(),
  extract: vi.fn(),
  target: vi.fn(),
  record: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-test' }, can: (cap: string) => cap === 'dispatch.upload' && m.canUpload }),
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
  attachmentToFile: () => new File(['x'], 'tb.pdf', { type: 'application/pdf' }),
  resolveRecordTarget: m.target,
  recordDocFromFile: m.record,
}));

import { AiChatDialog } from '../AiChatDialog';

const PLACEHOLDER = 'Nhập câu hỏi hoặc kéo thả tệp vào đây...';
const FIELDS = {
  category: 'van-ban', docNumber: '2753/2026/TB-BĐH', title: 'Chương trình lãi suất',
  issuedDate: '2026-09-18', effectiveFrom: '2026-09-21', effectiveTo: '2026-10-31',
};

beforeEach(() => {
  m.canUpload = false;
  m.send.mockReset().mockResolvedValue(undefined);
  m.extract.mockReset().mockResolvedValue(FIELDS);
  m.target.mockReset().mockResolvedValue({ repo: { id: 1 }, token: 't' });
  m.record.mockReset().mockResolvedValue({ id: '9' });
});
afterEach(cleanup);

const pdf = () => new File(['%PDF-1.4'], 'tb.pdf', { type: 'application/pdf' });
const textarea = () => screen.getByPlaceholderText(PLACEHOLDER);

function drop(file: File) {
  fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [file] } });
}

async function dropAndChoose(props: { canRecordDocs?: boolean; onDocRecorded?: () => void } = {}, choice = 'Thêm văn bản mới') {
  render(<AiChatDialog isOpen onClose={() => {}} {...props} />);
  drop(pdf());
  await screen.findByText('tb.pdf');
  fireEvent.click(screen.getByRole('button', { name: choice }));
}
const dropAndAdd = (props: { canRecordDocs?: boolean; onDocRecorded?: () => void } = {}) => dropAndChoose(props);

describe('Chat AI - ô nhập và kéo thả', () => {
  it('placeholder gọn', () => {
    render(<AiChatDialog isOpen onClose={() => {}} />);
    expect(textarea()).toBeTruthy();
  });

  it('kéo tệp qua vùng chat hiện gợi ý thả, rời đi thì mất', () => {
    render(<AiChatDialog isOpen onClose={() => {}} />);
    fireEvent.dragEnter(textarea(), { dataTransfer: { types: ['Files'] } });
    expect(screen.getByText('Thả tệp để đính kèm')).toBeTruthy();
    fireEvent.dragLeave(textarea(), { dataTransfer: { types: ['Files'] } });
    expect(screen.queryByText('Thả tệp để đính kèm')).toBeNull();
  });

  it('kéo chữ (không phải tệp) không hiện gợi ý thả', () => {
    render(<AiChatDialog isOpen onClose={() => {}} />);
    fireEvent.dragEnter(textarea(), { dataTransfer: { types: ['text/plain'] } });
    expect(screen.queryByText('Thả tệp để đính kèm')).toBeNull();
  });

  it('thả tệp chỉ đính kèm và hỏi muốn làm gì; chưa tự gửi câu hỏi nào, Enter khi chưa gõ gì cũng không gửi', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    drop(pdf());
    expect(await screen.findByText('tb.pdf')).toBeTruthy();
    const group = screen.getByRole('group', { name: 'Chọn việc cần làm với tệp' });
    expect(group.textContent).toContain('Bạn muốn làm gì với tệp này?');
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tóm tắt văn bản', 'Đọc văn bản', 'Thêm văn bản mới']);

    fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(m.send).not.toHaveBeenCalled();
    expect(m.extract).not.toHaveBeenCalled();
    expect((screen.getByTitle('Gửi tin nhắn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('thả định dạng AI không đọc được thì báo lỗi, không đính kèm', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} />);
    drop(new File(['x'], 'a.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    expect(await screen.findByText(/không được hỗ trợ/)).toBeTruthy();
    expect(screen.queryByText('a.docx')).toBeNull();
  });
});

describe('Chat AI - chọn việc với tệp vừa thả', () => {
  it('Tóm tắt văn bản: gửi câu hỏi tóm tắt kèm tệp, không đề xuất ghi nhận, dải lựa chọn biến mất', async () => {
    await dropAndChoose({ canRecordDocs: true }, 'Tóm tắt văn bản');
    expect(m.send).toHaveBeenCalledTimes(1);
    const [msg, , atts] = m.send.mock.calls[0];
    expect(msg).toMatch(/^Tóm tắt văn bản đính kèm/);
    expect(atts).toEqual([expect.objectContaining({ name: 'tb.pdf' })]);
    expect(m.extract).not.toHaveBeenCalled();
    expect(screen.queryByRole('group', { name: 'Chọn việc cần làm với tệp' })).toBeNull();
    expect(screen.queryByText('tb.pdf')).toBeNull();
  });

  it('Đọc văn bản: gửi câu hỏi đọc đầy đủ, khác câu tóm tắt', async () => {
    await dropAndChoose({ canRecordDocs: true }, 'Đọc văn bản');
    expect(m.send.mock.calls[0][0]).toContain('trình bày lại đầy đủ nội dung');
    expect(m.extract).not.toHaveBeenCalled();
  });

  it('không còn câu hỏi rập khuôn tự điền cho mọi tệp', async () => {
    await dropAndChoose({}, 'Đọc văn bản');
    expect(JSON.stringify(m.send.mock.calls)).not.toContain('trích xuất các thông tin');
  });

  it('tự gõ câu hỏi riêng: Enter gửi đúng câu đó kèm tệp, chỉ còn lựa chọn Thêm văn bản mới', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    drop(pdf());
    await screen.findByText('tb.pdf');
    fireEvent.change(textarea(), { target: { value: 'Văn bản này có hiệu lực từ bao giờ?' } });
    const group = screen.getByRole('group', { name: 'Chọn việc cần làm với tệp' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Thêm văn bản mới']);

    fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(m.send).toHaveBeenCalledWith('Văn bản này có hiệu lực từ bao giờ?', undefined, [expect.objectContaining({ name: 'tb.pdf' })]);
    expect(m.extract).not.toHaveBeenCalled();
  });
});

describe('Chat AI - đọc tệp và ghi nhận vào Văn thư', () => {
  it('Thêm văn bản mới: AI trích các trường và hiện thẻ có thể sửa, không trả lời trong chat', async () => {
    await dropAndAdd({ canRecordDocs: true });

    expect(m.send).not.toHaveBeenCalled();
    expect(m.extract).toHaveBeenCalledWith(expect.objectContaining({ name: 'tb.pdf' }), 'gemini-test');
    await waitFor(() => expect((screen.getByLabelText('Số hiệu') as HTMLInputElement).value).toBe('2753/2026/TB-BĐH'));
    expect((screen.getByLabelText('Tiêu đề') as HTMLInputElement).value).toBe('Chương trình lãi suất');
    expect(screen.queryByLabelText('Loại văn bản')).toBeNull();
    expect((screen.getByLabelText('Ngày ban hành') as HTMLInputElement).value).toBe('18/09/2026');
    expect((screen.getByLabelText('Ngày hết hiệu lực') as HTMLInputElement).value).toBe('31/10/2026');
  });

  it('AI chưa tự ghi: chỉ khi bấm Ghi nhận mới tải lên Kho và lưu, kèm các trường đã sửa', async () => {
    const onDocRecorded = vi.fn();
    await dropAndAdd({ canRecordDocs: true, onDocRecorded });
    const number = (await screen.findByLabelText('Số hiệu')) as HTMLInputElement;
    await waitFor(() => expect(number.value).not.toBe(''));
    expect(m.record).not.toHaveBeenCalled();

    fireEvent.change(number, { target: { value: '2753/2026/TB-ĐH2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }));

    expect(await screen.findByText('Đã ghi nhận vào Văn thư')).toBeTruthy();
    expect(m.record).toHaveBeenCalledTimes(1);
    const arg = m.record.mock.calls[0][0];
    expect(arg.fields).toMatchObject({ ...FIELDS, docNumber: '2753/2026/TB-ĐH2' });
    expect(arg.target).toEqual({ repo: { id: 1 }, token: 't' });
    expect(arg.file.name).toBe('tb.pdf');
    expect(onDocRecorded).toHaveBeenCalledTimes(1);
  });

  it('thiếu số hiệu: nút Ghi nhận bị khóa và nói rõ thiếu gì', async () => {
    m.extract.mockResolvedValue({ ...FIELDS, docNumber: '' });
    await dropAndAdd({ canRecordDocs: true });
    const btn = (await screen.findByRole('button', { name: 'Ghi nhận vào Văn thư' })) as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(true));
    expect(screen.getByText('Nhập số hiệu văn bản.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Số hiệu'), { target: { value: 'S1' } });
    expect(btn.disabled).toBe(false);
  });

  it('ghi nhận hỏng: hiện lỗi, giữ nguyên các trường và cho bấm lại', async () => {
    m.record.mockRejectedValueOnce(new Error('Tệp đã lên Kho (a/b.pdf) nhưng chưa ghi được văn bản: RLS'));
    const onDocRecorded = vi.fn();
    await dropAndAdd({ canRecordDocs: true, onDocRecorded });
    const btn = (await screen.findByRole('button', { name: 'Ghi nhận vào Văn thư' })) as HTMLButtonElement;
    await waitFor(() => expect((screen.getByLabelText('Số hiệu') as HTMLInputElement).value).not.toBe(''));

    fireEvent.click(btn);
    expect((await screen.findByRole('alert')).textContent).toMatch(/chưa ghi được văn bản: RLS/);
    expect(onDocRecorded).not.toHaveBeenCalled();
    expect((screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByLabelText('Số hiệu') as HTMLInputElement).value).toBe('2753/2026/TB-BĐH');
  });

  it('AI đọc tệp lỗi: hiện thông điệp lỗi, không có form giả', async () => {
    m.extract.mockRejectedValue(new Error('Chưa cấu hình khóa Gemini nên AI không đọc được tệp.'));
    await dropAndAdd({ canRecordDocs: true });
    expect((await screen.findByRole('alert')).textContent).toMatch(/Chưa cấu hình khóa Gemini/);
    expect(screen.queryByLabelText('Số hiệu')).toBeNull();
  });

  it('không phải admin: không có lựa chọn Thêm văn bản mới, vẫn tóm tắt và đọc được', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    drop(pdf());
    await screen.findByText('tb.pdf');
    expect(screen.queryByRole('button', { name: 'Thêm văn bản mới' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tóm tắt văn bản' }));
    expect(m.send).toHaveBeenCalled();
    expect(m.extract).not.toHaveBeenCalled();
    expect(screen.queryByText(/Ghi nhận vào Văn thư/)).toBeNull();
  });

  it('bỏ đề xuất thì thẻ biến mất mà không ghi gì', async () => {
    await dropAndAdd({ canRecordDocs: true });
    await screen.findByLabelText('Số hiệu');
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ đề xuất' }));
    expect(screen.queryByLabelText('Số hiệu')).toBeNull();
    expect(m.record).not.toHaveBeenCalled();
  });
});

describe('Chat AI - ghi nhận mặc định theo quyền tài khoản', () => {
  it('không truyền canRecordDocs: admin (dispatch.upload) có lựa chọn Thêm văn bản mới ở mọi trang chat', async () => {
    m.canUpload = true;
    render(<AiChatDialog isOpen onClose={() => {}} />);
    drop(pdf());
    await screen.findByText('tb.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm văn bản mới' }));
    expect(await screen.findByLabelText('Số hiệu')).toBeTruthy();
    expect(m.extract).toHaveBeenCalledTimes(1);
  });

  it('không truyền canRecordDocs: tài khoản thường không thấy lựa chọn Thêm văn bản mới', async () => {
    m.canUpload = false;
    render(<AiChatDialog isOpen onClose={() => {}} />);
    drop(pdf());
    await screen.findByText('tb.pdf');
    expect(screen.queryByRole('button', { name: 'Thêm văn bản mới' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Đọc văn bản' })).toBeTruthy();
  });

  it('truyền canRecordDocs tường minh thì ưu tiên hơn quyền mặc định', async () => {
    m.canUpload = true;
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    drop(pdf());
    await screen.findByText('tb.pdf');
    expect(screen.queryByRole('button', { name: 'Thêm văn bản mới' })).toBeNull();
  });
});
