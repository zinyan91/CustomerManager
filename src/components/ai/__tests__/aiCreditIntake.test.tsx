// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

const m = vi.hoisted(() => ({
  send: vi.fn(),
  extract: vi.fn(),
  find: vi.fn(),
  record: vi.fn(),
  word: vi.fn(),
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, can: () => false }),
}));
vi.mock('../../../hooks/useAiAssistant', () => ({
  useAiAssistant: () => ({
    threads: [], activeThreadId: null, messages: [], isStreaming: false, streamingText: '', attachedDoc: null,
    model: 'gemini-test', error: null, setModel: vi.fn(), setAttachedDoc: vi.fn(), sendMessage: m.send,
    stopStreaming: vi.fn(), clearMessages: vi.fn(), createNewThread: vi.fn(), selectThread: vi.fn(),
    deleteThread: vi.fn(), askAboutDocument: vi.fn(),
  }),
}));
vi.mock('../../../lib/ai/creditExtract', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/ai/creditExtract')>()),
  extractCreditProfile: m.extract,
}));
vi.mock('../../../lib/api/creditIntakeApi', () => ({
  findCustomerForIntake: m.find,
  recordCreditIntake: m.record,
}));

vi.mock('../../../lib/ai/wordText', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/ai/wordText')>()),
  fileToWordAttachment: m.word,
}));

import { AiChatDialog } from '../AiChatDialog';

const PLACEHOLDER = 'Nhập câu hỏi hoặc kéo thả tệp vào đây...';
const EXTRACTION = {
  customer: {
    cif: '12345678', fullName: 'Nguyễn Văn An', nationalId: '079090123456', idCardIssueDate: '2021-03-15', idCardIssuePlace: 'Cục CSQLHC',
    phone: '0901234567', email: '', address: '12 Lê Lợi', accountNumber: '', maritalStatus: 'Độc thân',
    spouseName: '', spouseNationalId: '', spousePhone: '', monthlyIncome: null,
  },
  collaterals: [
    { assetCode: 'CT-001', assetType: 'Bất động sản đất ở', address: 'Thửa 12', ownerName: 'Nguyễn Văn An', appraisedValue: 2500000000, appraisalDate: '2026-09-10', tenorMonths: 12, ltvPercent: 80, note: '' },
    { assetCode: 'CT-002', assetType: 'Phương tiện vận tải', address: '51A-123.45', ownerName: 'Lê Văn C', appraisedValue: 800000000, appraisalDate: '', tenorMonths: 12, ltvPercent: 70, note: '' },
  ],
};

beforeEach(() => {
  m.send.mockReset().mockResolvedValue(undefined);
  m.extract.mockReset().mockResolvedValue(structuredClone(EXTRACTION));
  m.find.mockReset().mockResolvedValue(null);
  m.word.mockReset().mockImplementation(async (f: File) => ({ id: `word_${f.name}`, name: f.name, mimeType: 'word', size: 1, base64Data: '', textData: 'Họ tên | Nguyễn Văn An' }));
  m.record.mockReset().mockResolvedValue({
    customerId: 7, customerName: 'NGUYỄN VĂN AN', customerAction: 'created', filled: [],
    collaterals: [{ index: 0, ok: true, action: 'created' }, { index: 1, ok: true, action: 'created' }],
  });
});
afterEach(cleanup);

const textarea = () => screen.getByPlaceholderText(PLACEHOLDER);
const pdf = () => new File(['%PDF-1.4'], 'to-trinh.pdf', { type: 'application/pdf' });

async function openCard() {
  render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
  fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf()] } });
  await screen.findByText('to-trinh.pdf');
  fireEvent.click(screen.getByRole('button', { name: 'Nhập hồ sơ tín dụng' }));
  await screen.findByLabelText('Họ tên');
}

describe('Chat AI - nhập hồ sơ tín dụng', () => {
  it('có cho cả tài khoản thường; AI đọc tệp, không trả lời trong chat', async () => {
    await openCard();
    expect(m.extract).toHaveBeenCalledWith(expect.objectContaining({ name: 'to-trinh.pdf' }), 'gemini-test');
    expect(m.send).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Họ tên') as HTMLInputElement).value).toBe('Nguyễn Văn An');
    expect((screen.getByLabelText('Mã CIF') as HTMLInputElement).value).toBe('12345678');
    expect(screen.getByLabelText('Tài sản 1')).toBeTruthy();
    expect(screen.getByLabelText('Tài sản 2')).toBeTruthy();
  });

  it('khách hàng chưa có thì báo sẽ tạo mới', async () => {
    await openCard();
    expect(await screen.findByText('Chưa có, sẽ tạo khách hàng mới')).toBeTruthy();
    expect(m.find).toHaveBeenCalledWith('12345678', '079090123456');
  });

  it('khách hàng đã có thì báo rõ khớp theo gì và chỉ điền ô trống', async () => {
    m.find.mockResolvedValue({ customer: { Id: 7, FullName: 'NGUYỄN VĂN AN' }, by: 'cif' });
    await openCard();
    expect((await screen.findByText(/Đã có trong hệ thống: NGUYỄN VĂN AN \(theo CIF\)/)).textContent).toContain('Chỉ điền ô còn trống');
  });

  it('CIF và CCCD thuộc hai người khác nhau: hiện lỗi từ hệ thống, không đoán', async () => {
    m.find.mockRejectedValue(new Error('CIF 123 thuộc khách hàng AN nhưng CCCD 079 thuộc khách hàng BÌNH.'));
    await openCard();
    expect((await screen.findByText(/CIF 123 thuộc khách hàng AN nhưng CCCD/)).textContent).toBeTruthy();
  });

  it('AI chưa tự ghi: chỉ khi bấm Ghi vào hệ thống mới gọi ghi, kèm các trường đã sửa', async () => {
    await openCard();
    await screen.findByText('Chưa có, sẽ tạo khách hàng mới');
    expect(m.record).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: '0912345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi vào hệ thống' }));

    expect(await screen.findByText('Đã ghi vào hệ thống')).toBeTruthy();
    expect(m.record).toHaveBeenCalledTimes(1);
    const arg = m.record.mock.calls[0][0];
    expect(arg.customer).toMatchObject({ fullName: 'Nguyễn Văn An', phone: '0912345678', cif: '12345678' });
    expect(arg.collaterals).toHaveLength(2);
    expect(arg.skip.size).toBe(0);
    expect(screen.getByText(/Đã tạo khách hàng mới NGUYỄN VĂN AN; 2 tài sản mới\./)).toBeTruthy();
  });

  it('thiếu CIF khi tạo khách hàng mới: khóa nút và nói rõ thiếu gì', async () => {
    m.extract.mockResolvedValue({ ...structuredClone(EXTRACTION), customer: { ...EXTRACTION.customer, cif: '' } });
    await openCard();
    const btn = screen.getByRole('button', { name: 'Ghi vào hệ thống' }) as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(true));
    expect(screen.getByText(/Nhập mã CIF khách hàng/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Mã CIF'), { target: { value: '999' } });
    await waitFor(() => expect(btn.disabled).toBe(false));
  });

  it('khách hàng đã có thì không cần CIF trong hồ sơ', async () => {
    m.extract.mockResolvedValue({ ...structuredClone(EXTRACTION), customer: { ...EXTRACTION.customer, cif: '' } });
    m.find.mockResolvedValue({ customer: { Id: 7, FullName: 'NGUYỄN VĂN AN' }, by: 'nationalId' });
    await openCard();
    const btn = screen.getByRole('button', { name: 'Ghi vào hệ thống' }) as HTMLButtonElement;
    await waitFor(() => expect(btn.disabled).toBe(false));
  });

  it('thiếu giá trị định giá: khóa nút và chỉ rõ tài sản nào', async () => {
    const data = structuredClone(EXTRACTION);
    data.collaterals[1].appraisedValue = null as unknown as number;
    m.extract.mockResolvedValue(data);
    await openCard();
    await waitFor(() => expect(screen.getByText('Tài sản 2: nhập giá trị định giá.')).toBeTruthy());
    expect((screen.getByRole('button', { name: 'Ghi vào hệ thống' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('bỏ một tài sản thì chỉ ghi các tài sản còn lại', async () => {
    await openCard();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ tài sản 2' }));
    expect(screen.queryByLabelText('Tài sản 2')).toBeNull();
    await screen.findByText('Chưa có, sẽ tạo khách hàng mới');
    fireEvent.click(screen.getByRole('button', { name: 'Ghi vào hệ thống' }));
    await waitFor(() => expect(m.record).toHaveBeenCalled());
    expect(m.record.mock.calls[0][0].collaterals).toHaveLength(1);
  });

  it('chủ tài sản khác người vay thì cảnh báo trên đúng tài sản đó', async () => {
    await openCard();
    expect(within(screen.getByLabelText('Tài sản 2')).getByRole('note').textContent).toMatch(/chủ tài sản là Lê Văn C, khác người vay/);
    expect(within(screen.getByLabelText('Tài sản 1')).queryByRole('note')).toBeNull();
  });

  it('một tài sản lỗi: giữ thẻ mở, nói rõ lỗi, tài sản đã lưu bị khóa; ghi lại không lưu trùng', async () => {
    m.record.mockResolvedValueOnce({
      customerId: 7, customerName: 'NGUYỄN VĂN AN', customerAction: 'created', filled: [],
      collaterals: [{ index: 0, ok: true, action: 'created' }, { index: 1, ok: false, error: 'Mã chứng thư TSĐB đã tồn tại' }],
    });
    await openCard();
    await screen.findByText('Chưa có, sẽ tạo khách hàng mới');
    fireEvent.click(screen.getByRole('button', { name: 'Ghi vào hệ thống' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/Chưa lưu được 1 tài sản\. Tài sản 2: Mã chứng thư TSĐB đã tồn tại/);
    expect(within(screen.getByLabelText('Tài sản 1')).getByText('Đã lưu')).toBeTruthy();
    expect((within(screen.getByLabelText('Tài sản 1')).getByLabelText('Mã chứng thư') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByText('Đã ghi vào hệ thống')).toBeNull();

    m.record.mockResolvedValueOnce({
      customerId: 7, customerName: 'NGUYỄN VĂN AN', customerAction: 'unchanged', filled: [],
      collaterals: [{ index: 1, ok: true, action: 'created' }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ghi vào hệ thống' }));
    expect(await screen.findByText('Đã ghi vào hệ thống')).toBeTruthy();
    expect([...m.record.mock.calls[1][0].skip]).toEqual([0]);
  });

  it('lỗi khi lưu khách hàng: hiện lỗi, giữ nguyên các trường, cho bấm lại', async () => {
    m.record.mockRejectedValueOnce(new Error('Mã CIF "12345678" đã tồn tại trên hệ thống (thuộc KH: AN)!'));
    await openCard();
    await screen.findByText('Chưa có, sẽ tạo khách hàng mới');
    fireEvent.click(screen.getByRole('button', { name: 'Ghi vào hệ thống' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/đã tồn tại trên hệ thống/);
    expect((screen.getByLabelText('Họ tên') as HTMLInputElement).value).toBe('Nguyễn Văn An');
    expect((screen.getByRole('button', { name: 'Ghi vào hệ thống' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('khách hàng đã có và được điền thêm ô: tóm tắt nêu các ô đã điền', async () => {
    m.find.mockResolvedValue({ customer: { Id: 7, FullName: 'NGUYỄN VĂN AN' }, by: 'cif' });
    m.record.mockResolvedValue({
      customerId: 7, customerName: 'NGUYỄN VĂN AN', customerAction: 'updated', filled: ['Số CCCD', 'Địa chỉ'],
      collaterals: [{ index: 0, ok: true, action: 'updated' }, { index: 1, ok: true, action: 'created' }],
    });
    await openCard();
    await screen.findByText(/Đã có trong hệ thống/);
    fireEvent.click(screen.getByRole('button', { name: 'Ghi vào hệ thống' }));
    expect(await screen.findByText(/Đã cập nhật khách hàng NGUYỄN VĂN AN \(điền thêm: Số CCCD, Địa chỉ\); 1 tài sản mới; 1 tài sản cập nhật\./)).toBeTruthy();
  });

  it('AI đọc tệp lỗi: hiện lỗi, không có thẻ giả', async () => {
    m.extract.mockRejectedValue(new Error('Chưa cấu hình khóa Gemini nên AI không đọc được tệp.'));
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [pdf()] } });
    await screen.findByText('to-trinh.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Nhập hồ sơ tín dụng' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Chưa cấu hình khóa Gemini/);
    expect(screen.queryByLabelText('Họ tên')).toBeNull();
  });

  it('bỏ đề xuất thì thẻ biến mất mà không ghi gì', async () => {
    await openCard();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ đề xuất' }));
    expect(screen.queryByLabelText('Họ tên')).toBeNull();
    expect(m.record).not.toHaveBeenCalled();
  });

  it('sửa CIF rồi rời ô thì tra lại khách hàng', async () => {
    await openCard();
    await screen.findByText('Chưa có, sẽ tạo khách hàng mới');
    m.find.mockResolvedValue({ customer: { Id: 9, FullName: 'KHÁC' }, by: 'cif' });
    fireEvent.change(screen.getByLabelText('Mã CIF'), { target: { value: '555' } });
    fireEvent.blur(screen.getByLabelText('Mã CIF'));
    expect(await screen.findByText(/Đã có trong hệ thống: KHÁC/)).toBeTruthy();
    expect(m.find).toHaveBeenLastCalledWith('555', '079090123456');
  });

  it('tờ trình là tệp Word: AI nhận nội dung dạng chữ (không phải tệp nhị phân) và vẫn ra thẻ để ghi', async () => {
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    const docx = new File(['PK'], 'to-trinh.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [docx] } });
    await screen.findByText('to-trinh.docx');
    fireEvent.click(screen.getByRole('button', { name: 'Nhập hồ sơ tín dụng' }));
    await screen.findByLabelText('Họ tên');
    const sent = m.extract.mock.calls[0][0];
    expect(sent).toMatchObject({ name: 'to-trinh.docx', base64Data: '' });
    expect(sent.textData).toContain('Nguyễn Văn An');
    expect(m.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Ghi vào hệ thống' }));
    await waitFor(() => expect(m.record).toHaveBeenCalledTimes(1));
  });

  it('đọc tệp Word lỗi khi nhập hồ sơ: báo lỗi, không tạo thẻ, không gọi AI', async () => {
    m.word.mockRejectedValue(new Error('Không đọc được tệp Word "to-trinh.docx": hỏng'));
    render(<AiChatDialog isOpen onClose={() => {}} canRecordDocs={false} />);
    fireEvent.drop(textarea(), { dataTransfer: { types: ['Files'], files: [new File(['PK'], 'to-trinh.docx')] } });
    await screen.findByText('to-trinh.docx');
    fireEvent.click(screen.getByRole('button', { name: 'Nhập hồ sơ tín dụng' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Không đọc được tệp Word/);
    expect(m.extract).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Họ tên')).toBeNull();
  });
});
