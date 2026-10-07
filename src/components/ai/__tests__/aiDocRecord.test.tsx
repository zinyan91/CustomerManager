// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  canUpload: false,
  send: vi.fn(),
  extract: vi.fn(),
  target: vi.fn(),
  record: vi.fn(),
  findForms: vi.fn(),
  sheet: vi.fn(),
  word: vi.fn(),
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
  findFormFiles: m.findForms,
}));

vi.mock('../../../lib/ai/spreadsheetText', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/ai/spreadsheetText')>()),
  fileToSpreadsheetAttachment: m.sheet,
}));

vi.mock('../../../lib/ai/wordText', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/ai/wordText')>()),
  fileToWordAttachment: m.word,
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
  m.findForms.mockReset().mockResolvedValue({ files: [], note: null });
  m.word.mockReset().mockImplementation(async (f: File) => ({ id: `word_${f.name}`, name: f.name, mimeType: 'word', size: 1, base64Data: '', textData: 'TỜ TRÌNH TÍN DỤNG\nHọ tên | Nguyễn Văn An' }));
  m.sheet.mockReset().mockImplementation(async (f: File) => ({ id: `sheet_${f.name}`, name: f.name, mimeType: 'sheet', size: 1, base64Data: '', textData: `### Sheet "B01a"\n100,Tài sản,1` }));
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
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tóm tắt văn bản', 'Đọc văn bản', 'Thêm văn bản mới', 'Nhập hồ sơ tín dụng']);

    fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect(m.send).not.toHaveBeenCalled();
    expect(m.extract).not.toHaveBeenCalled();
    expect((screen.getByTitle('Gửi tin nhắn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('thả định dạng AI không đọc được thì báo lỗi, không đính kèm', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} />);
    drop(new File(['x'], 'a.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
    expect(await screen.findByText(/không được hỗ trợ/)).toBeTruthy();
    expect(screen.queryByText('a.pptx')).toBeNull();
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

const zip = (name = 'bieu-mau.zip') => new File(['PK'], name, { type: 'application/zip' });
const FORM = (name: string) => ({ kind: 'bieu-mau', repoId: 'o/bieu-mau', path: `bm/2753-2026-tb-bdh/${name}`, name });

describe('Chat AI - biểu mẫu của văn bản', () => {
  it('chỉ gửi PDF: AI tự tra kho Biểu mẫu theo số hiệu và hiện biểu mẫu tìm thấy', async () => {
    m.findForms.mockResolvedValue({ files: [FORM('mau-01.docx'), FORM('mau-02.xlsx')], note: null });
    await dropAndAdd({ canRecordDocs: true });

    expect(await screen.findByText('mau-01.docx')).toBeTruthy();
    expect(screen.getByText('mau-02.xlsx')).toBeTruthy();
    expect(m.findForms).toHaveBeenCalledWith({ repo: { id: 1 }, token: 't' }, '2753/2026/TB-BĐH');
  });

  it('bỏ bớt một biểu mẫu rồi ghi: chỉ gắn những biểu mẫu còn lại, không có thư mục nén', async () => {
    m.findForms.mockResolvedValue({ files: [FORM('mau-01.docx'), FORM('mau-02.xlsx')], note: null });
    await dropAndAdd({ canRecordDocs: true });
    await screen.findByText('mau-01.docx');

    fireEvent.click(screen.getByRole('button', { name: 'Bỏ biểu mẫu mau-02.xlsx' }));
    expect(screen.queryByText('mau-02.xlsx')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }));

    await waitFor(() => expect(m.record).toHaveBeenCalledTimes(1));
    const arg = m.record.mock.calls[0][0];
    expect(arg.formUploads).toEqual([]);
    expect(arg.formFiles.map((f: { name: string }) => f.name)).toEqual(['mau-01.docx']);
  });

  it('không có biểu mẫu khớp thì nói rõ, vẫn ghi được văn bản', async () => {
    await dropAndAdd({ canRecordDocs: true });
    expect(await screen.findByText(/Không có biểu mẫu khớp số hiệu/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }));
    await waitFor(() => expect(m.record).toHaveBeenCalledTimes(1));
    expect(m.record.mock.calls[0][0].formFiles).toEqual([]);
  });

  it('tra kho Biểu mẫu hỏng thì hiện lý do, không giả làm "không có biểu mẫu"', async () => {
    m.findForms.mockRejectedValue(new Error('Token kho lưu trữ bị từ chối (403).'));
    await dropAndAdd({ canRecordDocs: true });
    expect(await screen.findByText(/Chưa tra được kho Biểu mẫu: Token kho lưu trữ bị từ chối/)).toBeTruthy();
    expect(screen.queryByText(/Không có biểu mẫu khớp số hiệu/)).toBeNull();
  });

  it('chưa có kho Biểu mẫu thì hiện ghi chú của lần tra', async () => {
    m.findForms.mockResolvedValue({ files: [], note: 'Chưa có kho Biểu mẫu nên chưa tự tra được biểu mẫu.' });
    await dropAndAdd({ canRecordDocs: true });
    expect(await screen.findByText(/Chưa có kho Biểu mẫu nên chưa tự tra/)).toBeTruthy();
  });

  it('sửa số hiệu rồi "Tra lại theo số hiệu" thì tra lại với số hiệu mới', async () => {
    await dropAndAdd({ canRecordDocs: true });
    await screen.findByText(/Không có biểu mẫu khớp số hiệu/);
    m.findForms.mockResolvedValue({ files: [FORM('moi.docx')], note: null });

    fireEvent.change(screen.getByLabelText('Số hiệu'), { target: { value: '9999/2026/TB-X' } });
    fireEvent.click(screen.getByRole('button', { name: /Tra lại theo số hiệu/ }));

    expect(await screen.findByText('moi.docx')).toBeTruthy();
    expect(m.findForms).toHaveBeenLastCalledWith(expect.anything(), '9999/2026/TB-X');
  });

  it('gửi PDF kèm thư mục nén: không tự tra kho, zip được ghi làm biểu mẫu', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf(), zip()] } });
    await screen.findByText('bieu-mau.zip');
    expect(screen.getByTitle('Gỡ biểu mẫu')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Thêm văn bản mới' }));
    await screen.findByLabelText('Số hiệu');
    expect(await screen.findAllByText('bieu-mau.zip')).toHaveLength(1);
    expect(m.findForms).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Tra lại theo số hiệu/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }));
    await waitFor(() => expect(m.record).toHaveBeenCalledTimes(1));
    const arg = m.record.mock.calls[0][0];
    expect(arg.formUploads.map((f: File) => f.name)).toEqual(['bieu-mau.zip']);
    expect(arg.formFiles).toEqual([]);
  });

  it('tệp AI không đọc được đứng một mình (chưa có văn bản): không ép thêm PDF, chỉ báo AI không đọc được định dạng này', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [zip()] } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/bieu-mau.zip.*không được hỗ trợ/);
    expect(screen.queryByText(/Thêm văn bản PDF hoặc ảnh/)).toBeNull();
    expect(screen.queryByTitle('Gỡ biểu mẫu')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Chọn việc cần làm với tệp' })).toBeNull();
  });

  it('tệp XML (kê khai thuế) là chữ thuần: AI đọc được, không cần PDF đi kèm và không bị coi là biểu mẫu', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    const xml = new File(['<HSoKhaiThue><ten>Cty A</ten></HSoKhaiThue>'], 'ETAX11320240234717015.xml', { type: 'text/xml' });
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [xml] } });
    await screen.findByText('ETAX11320240234717015.xml');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByTitle('Gỡ biểu mẫu')).toBeNull();
    expect(screen.getByTitle('Gỡ tệp Word')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Chọn việc cần làm với tệp' })).toBeTruthy();
  });

  it('hai văn bản cùng một thư mục nén: báo, không cho thêm', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), {
      dataTransfer: { types: ['Files'], files: [pdf(), new File(['%PDF'], 'b.pdf', { type: 'application/pdf' }), zip()] },
    });
    await screen.findByText('bieu-mau.zip');
    expect((await screen.findByRole('alert')).textContent).toMatch(/chỉ đi kèm một văn bản/);
    expect(screen.queryByRole('button', { name: 'Thêm văn bản mới' })).toBeNull();
  });

  it('có thư mục nén thì chỉ còn việc Thêm văn bản mới', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf(), zip()] } });
    await screen.findByText('bieu-mau.zip');
    const group = screen.getByRole('group', { name: 'Chọn việc cần làm với tệp' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Thêm văn bản mới']);
  });

  it('gõ câu hỏi rồi Enter khi còn thư mục nén: báo lỗi, không lẳng lặng bỏ thư mục nén', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf(), zip()] } });
    await screen.findByText('bieu-mau.zip');
    fireEvent.change(textarea(), { target: { value: 'Văn bản này nói gì?' } });
    fireEvent.keyDown(textarea(), { key: 'Enter' });
    expect((await screen.findAllByRole('alert')).map((a) => a.textContent).join(' ')).toMatch(/Biểu mẫu chỉ dùng với/);
    expect(m.send).not.toHaveBeenCalled();
  });

  it('tài khoản không được thêm văn bản thì không nhận biểu mẫu, gặp báo lỗi định dạng như mọi tệp AI không đọc được', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf(), zip()] } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/không được hỗ trợ/);
    expect(screen.queryByText('bieu-mau.zip')).toBeNull();
    expect(screen.getByText('tb.pdf')).toBeTruthy();
  });

  it('gỡ thư mục nén khỏi dải đính kèm', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf(), zip()] } });
    await screen.findByText('bieu-mau.zip');
    fireEvent.click(screen.getByTitle('Gỡ biểu mẫu'));
    expect(screen.queryByText('bieu-mau.zip')).toBeNull();
    const group = screen.getByRole('group', { name: 'Chọn việc cần làm với tệp' });
    expect(within(group).getAllByRole('button')).toHaveLength(4);
  });

  const docx = (name: string) => new File(['x'], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  it('bộ biểu mẫu nhiều tệp (tờ trình, hợp đồng...) đi kèm PDF: hiện từng tệp, báo sẽ nén thành một ZIP, ghi nhận gửi đủ các tệp', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), {
      dataTransfer: { types: ['Files'], files: [pdf(), docx('to-trinh.docx'), docx('hop-dong.docx'), docx('phu-luc.docx')] },
    });
    await screen.findByText('to-trinh.docx');
    expect(screen.getByText('hop-dong.docx')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Thêm văn bản mới' }));
    await screen.findByLabelText('Số hiệu');
    expect(await screen.findByText('3 tệp sẽ được nén thành một tệp ZIP trong kho Biểu mẫu.')).toBeTruthy();
    expect(m.findForms).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }));
    await waitFor(() => expect(m.record).toHaveBeenCalledTimes(1));
    expect(m.record.mock.calls[0][0].formUploads.map((f: File) => f.name)).toEqual(['to-trinh.docx', 'hop-dong.docx', 'phu-luc.docx']);
  });

  it('chỉ có một tệp Word kèm PDF cũng là biểu mẫu, không báo lỗi định dạng', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf(), docx('mau-01.docx')] } });
    await screen.findByText('mau-01.docx');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Chat AI - bảng tính (báo cáo tài chính Excel)', () => {
  const xlsx = (name = 'bctc-2025.xlsx') => new File(['PK'], name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  it('chỉ có bảng tính: không báo lỗi định dạng, chỉ hiện việc Phân tích báo cáo tài chính (cả tài khoản thường)', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [xlsx()] } });
    await screen.findByText('bctc-2025.xlsx');
    expect(screen.queryByRole('alert')).toBeNull();
    const group = screen.getByRole('group', { name: 'Chọn việc cần làm với tệp' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Phân tích báo cáo tài chính']);
  });

  it('Phân tích báo cáo tài chính: gửi câu hỏi phân tích kèm nội dung bảng tính dạng chữ, không đề xuất ghi nhận', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [xlsx()] } });
    await screen.findByText('bctc-2025.xlsx');
    fireEvent.click(screen.getByRole('button', { name: 'Phân tích báo cáo tài chính' }));
    await waitFor(() => expect(m.send).toHaveBeenCalledTimes(1));
    const [msg, , atts] = m.send.mock.calls[0];
    expect(msg).toMatch(/^Phân tích báo cáo tài chính/);
    expect(atts).toHaveLength(1);
    expect(atts[0]).toMatchObject({ name: 'bctc-2025.xlsx', base64Data: '' });
    expect(atts[0].textData).toContain('100,Tài sản,1');
    expect(m.extract).not.toHaveBeenCalled();
  });

  it('tự gõ câu hỏi rồi Enter: bảng tính vẫn đi kèm câu hỏi đó', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [xlsx()] } });
    await screen.findByText('bctc-2025.xlsx');
    fireEvent.change(textarea(), { target: { value: 'Khả năng trả nợ ra sao?' } });
    fireEvent.keyDown(textarea(), { key: 'Enter' });
    await waitFor(() => expect(m.send).toHaveBeenCalledTimes(1));
    expect(m.send.mock.calls[0][0]).toBe('Khả năng trả nợ ra sao?');
    expect(m.send.mock.calls[0][2][0].textData).toContain('Sheet');
  });

  it('đọc bảng tính lỗi: báo lỗi nêu tên tệp, không gửi gì, giữ tệp để thử lại', async () => {
    m.sheet.mockRejectedValue(new Error('Không đọc được bảng tính "bctc-2025.xlsx": hỏng'));
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [xlsx()] } });
    await screen.findByText('bctc-2025.xlsx');
    fireEvent.click(screen.getByRole('button', { name: 'Phân tích báo cáo tài chính' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Không đọc được bảng tính "bctc-2025.xlsx"/);
    expect(m.send).not.toHaveBeenCalled();
    expect(screen.getByText('bctc-2025.xlsx')).toBeTruthy();
  });

  it('gỡ bảng tính khỏi dải đính kèm', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [xlsx()] } });
    await screen.findByText('bctc-2025.xlsx');
    fireEvent.click(screen.getByTitle('Gỡ bảng tính'));
    expect(screen.queryByText('bctc-2025.xlsx')).toBeNull();
  });

  it('một văn bản PDF kèm bảng tính: Thêm văn bản mới thì bảng tính thành biểu mẫu, không đọc thành chữ', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf(), xlsx('phu-luc.xlsx')] } });
    await screen.findByText('phu-luc.xlsx');
    const group = screen.getByRole('group', { name: 'Chọn việc cần làm với tệp' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Tóm tắt văn bản', 'Đọc văn bản', 'Thêm văn bản mới', 'Phân tích báo cáo tài chính', 'Nhập hồ sơ tín dụng',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm văn bản mới' }));
    await screen.findByLabelText('Số hiệu');
    expect(m.sheet).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }));
    await waitFor(() => expect(m.record).toHaveBeenCalledTimes(1));
    expect(m.record.mock.calls[0][0].formUploads.map((f: File) => f.name)).toEqual(['phu-luc.xlsx']);
  });

  it('Tóm tắt văn bản kèm bảng tính: gửi cả PDF và nội dung bảng tính', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf(), xlsx()] } });
    await screen.findByText('bctc-2025.xlsx');
    fireEvent.click(screen.getByRole('button', { name: 'Tóm tắt văn bản' }));
    await waitFor(() => expect(m.send).toHaveBeenCalledTimes(1));
    expect(m.send.mock.calls[0][2].map((a: { name: string }) => a.name)).toEqual(['tb.pdf', 'bctc-2025.xlsx']);
  });
});

describe('Chat AI - tệp Word', () => {
  const docx = (name = 'to-trinh.docx') => new File(['PK'], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  it('chỉ có tệp Word: không báo lỗi định dạng, hiện các việc đọc được (cả tài khoản thường)', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [docx()] } });
    await screen.findByText('to-trinh.docx');
    expect(screen.queryByRole('alert')).toBeNull();
    const group = screen.getByRole('group', { name: 'Chọn việc cần làm với tệp' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Tóm tắt văn bản', 'Đọc văn bản', 'Phân tích báo cáo tài chính', 'Nhập hồ sơ tín dụng',
    ]);
  });

  it('Tóm tắt văn bản với tệp Word: gửi câu hỏi tóm tắt kèm nội dung Word dạng chữ', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [docx()] } });
    await screen.findByText('to-trinh.docx');
    fireEvent.click(screen.getByRole('button', { name: 'Tóm tắt văn bản' }));
    await waitFor(() => expect(m.send).toHaveBeenCalledTimes(1));
    const [msg, , atts] = m.send.mock.calls[0];
    expect(msg).toMatch(/^Tóm tắt văn bản đính kèm/);
    expect(atts).toHaveLength(1);
    expect(atts[0]).toMatchObject({ name: 'to-trinh.docx', base64Data: '' });
    expect(atts[0].textData).toContain('TỜ TRÌNH TÍN DỤNG');
  });

  it('tự gõ câu hỏi rồi Enter: nội dung Word đi kèm câu hỏi', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [docx()] } });
    await screen.findByText('to-trinh.docx');
    fireEvent.change(textarea(), { target: { value: 'Tờ trình này đề nghị cấp bao nhiêu?' } });
    fireEvent.keyDown(textarea(), { key: 'Enter' });
    await waitFor(() => expect(m.send).toHaveBeenCalledTimes(1));
    expect(m.send.mock.calls[0][2][0].textData).toContain('Nguyễn Văn An');
  });

  it('Word .doc cũ: báo hướng dẫn lưu lại, không đính kèm thành tệp rỗng', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [new File(['x'], 'cu.doc', { type: 'application/msword' })] } });
    expect((await screen.findByRole('alert')).textContent).toMatch(/Word định dạng cũ \(\.doc\).*\.docx hoặc PDF/);
    expect(screen.queryByText('cu.doc')).toBeNull();
  });

  it('đọc Word lỗi: báo lỗi nêu tên tệp, không gửi gì, giữ tệp để thử lại', async () => {
    m.word.mockRejectedValue(new Error('Không đọc được tệp Word "to-trinh.docx": hỏng'));
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [docx()] } });
    await screen.findByText('to-trinh.docx');
    fireEvent.click(screen.getByRole('button', { name: 'Đọc văn bản' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Không đọc được tệp Word "to-trinh.docx"/);
    expect(m.send).not.toHaveBeenCalled();
    expect(screen.getByText('to-trinh.docx')).toBeTruthy();
  });

  it('gỡ tệp Word khỏi dải đính kèm', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [docx()] } });
    await screen.findByText('to-trinh.docx');
    fireEvent.click(screen.getByTitle('Gỡ tệp Word'));
    expect(screen.queryByText('to-trinh.docx')).toBeNull();
  });

  it('PDF kèm Word: Thêm văn bản mới thì Word thành biểu mẫu, không đọc thành chữ', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf(), docx('bieu-mau-01.docx')] } });
    await screen.findByText('bieu-mau-01.docx');
    fireEvent.click(screen.getByRole('button', { name: 'Thêm văn bản mới' }));
    await screen.findByLabelText('Số hiệu');
    expect(m.word).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận vào Văn thư' }));
    await waitFor(() => expect(m.record).toHaveBeenCalledTimes(1));
    expect(m.record.mock.calls[0][0].formUploads.map((f: File) => f.name)).toEqual(['bieu-mau-01.docx']);
  });

  it('chỉ có Word thì không có việc Thêm văn bản mới (cần tệp gốc PDF hoặc ảnh)', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [docx()] } });
    await screen.findByText('to-trinh.docx');
    expect(screen.queryByRole('button', { name: 'Thêm văn bản mới' })).toBeNull();
  });
});
