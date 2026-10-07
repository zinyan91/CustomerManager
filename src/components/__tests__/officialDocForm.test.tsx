// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import type { OfficialDoc } from '../../types/officialDoc';

vi.mock('../dispatch/FilePickerModal', () => ({
  pickedKey: (r: string, p: string) => `${r}/${p}`,
  FilePickerModal: (p: {
    fileKind: string;
    title: string;
    pickedKeys: Set<string>;
    onPick: (f: { repoId: string; path: string; name: string }) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Bộ chọn tệp">
      <span>{p.title}</span>
      <span data-testid="file-kind">{p.fileKind}</span>
      <span data-testid="picked">{[...p.pickedKeys].join(',')}</span>
      <button type="button" onClick={() => p.onPick({ repoId: 'o/kho', path: 'a/qd.pdf', name: 'qd.pdf' })}>Chọn qd.pdf</button>
      <button type="button" onClick={p.onClose}>Xong chọn</button>
    </div>
  ),
}));

import { OfficialDocForm } from '../dispatch/OfficialDocForm';
import { DateFormatProvider } from '../../context/DateFormatContext';

afterEach(cleanup);

const existing: OfficialDoc = {
  id: '9',
  category: 'cong-van',
  docNumber: 'CV-1',
  title: 'Công văn một',
  issuedDate: '2026-05-01',
  effectiveFrom: '2026-05-10',
  effectiveTo: '2026-12-31',
  files: [{ kind: 'goc', repoId: 'o/kho', path: 'x/cv.pdf', name: 'cv.pdf' }],
  createdAt: 'c',
  updatedAt: 'u',
};

const setup = (doc: OfficialDoc | null = null, onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  const onClose = vi.fn();
  render(<OfficialDocForm doc={doc} defaultCategory="hop-dong" onSubmit={onSubmit} onClose={onClose} />);
  return { onSubmit, onClose };
};

const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

describe('OfficialDocForm - thêm mới', () => {
  it('mục mặc định theo mục đang xem; ngày ban hành = ngày hiệu lực = hôm nay, chưa có ngày hết hiệu lực', () => {
    setup();
    expect(value('Mục')).toBe('hop-dong');
    expect(value('Ngày ban hành')).toBe(value('Ngày hiệu lực'));
    expect(value('Ngày hết hiệu lực')).toBe('');
    expect(screen.getByRole('dialog', { name: 'Thêm văn bản' })).toBeTruthy();
  });

  it('ngày hiệu lực đi theo ngày ban hành cho tới khi người dùng tự sửa', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Ngày ban hành'), { target: { value: '01/03/2026' } });
    expect(value('Ngày hiệu lực')).toBe('01/03/2026');

    fireEvent.change(screen.getByLabelText('Ngày hiệu lực'), { target: { value: '15/03/2026' } });
    fireEvent.change(screen.getByLabelText('Ngày ban hành'), { target: { value: '05/03/2026' } });
    expect(value('Ngày hiệu lực')).toBe('15/03/2026');
  });

  it('thiếu số hiệu hoặc tiêu đề: báo lỗi và không gọi onSubmit', () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
    expect(screen.getByRole('alert').textContent).toMatch(/số hiệu/i);
    fireEvent.change(screen.getByLabelText('Số hiệu'), { target: { value: 'S1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
    expect(screen.getByRole('alert').textContent).toMatch(/tiêu đề/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ngày hết hiệu lực trước ngày hiệu lực bị từ chối', () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText('Số hiệu'), { target: { value: 'S1' } });
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Ngày hiệu lực'), { target: { value: '10/06/2026' } });
    fireEvent.change(screen.getByLabelText('Ngày hết hiệu lực'), { target: { value: '01/06/2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
    expect(screen.getByRole('alert').textContent).toMatch(/không được trước/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('chọn tệp từ Kho theo từng nhóm, đánh dấu đã chọn, gỡ được', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Chọn từ kho Biểu mẫu' }));
    const picker = screen.getByRole('dialog', { name: 'Bộ chọn tệp' });
    expect(within(picker).getByText('File biểu mẫu')).toBeTruthy();
    expect(within(picker).getByTestId('file-kind').textContent).toBe('bieu-mau');

    fireEvent.click(within(picker).getByRole('button', { name: 'Chọn qd.pdf' }));
    expect(within(picker).getByTestId('picked').textContent).toBe('o/kho/a/qd.pdf');
    // Chọn lại cùng tệp trong cùng nhóm không tạo trùng
    fireEvent.click(within(picker).getByRole('button', { name: 'Chọn qd.pdf' }));
    fireEvent.click(within(picker).getByRole('button', { name: 'Xong chọn' }));

    expect(screen.getAllByText('qd.pdf')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ tệp qd.pdf' }));
    expect(screen.queryByText('qd.pdf')).toBeNull();
  });

  it('lưu thành công gửi đúng dữ liệu; tệp đã chọn có loại tương ứng', async () => {
    const { onSubmit } = setup();
    fireEvent.change(screen.getByLabelText('Số hiệu'), { target: { value: ' 2753/2026/TB-BĐH ' } });
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Chương trình lãi suất' } });
    expect(screen.queryByLabelText('Loại văn bản')).toBeNull();
    fireEvent.change(screen.getByLabelText('Ngày ban hành'), { target: { value: '18/09/2026' } });
    fireEvent.change(screen.getByLabelText('Ngày hết hiệu lực'), { target: { value: '31/10/2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chọn từ kho Văn thư' }));
    expect(screen.getByTestId('file-kind').textContent).toBe('goc');
    fireEvent.click(screen.getByRole('button', { name: 'Chọn qd.pdf' }));
    fireEvent.click(screen.getByRole('button', { name: 'Xong chọn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      category: 'hop-dong',
      docNumber: ' 2753/2026/TB-BĐH ',
      title: 'Chương trình lãi suất',
      issuedDate: '2026-09-18',
      effectiveFrom: '2026-09-18',
      effectiveTo: '2026-10-31',
      files: [{ kind: 'goc', repoId: 'o/kho', path: 'a/qd.pdf', name: 'qd.pdf' }],
    });
  });

  it('API ném lỗi thì form giữ nguyên, hiện lỗi và cho bấm lưu lại', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Không lưu được văn bản: row-level security'));
    setup(null, onSubmit);
    fireEvent.change(screen.getByLabelText('Số hiệu'), { target: { value: 'S1' } });
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'T' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/row-level security/);
    expect((screen.getByRole('button', { name: 'Lưu văn bản' }) as HTMLButtonElement).disabled).toBe(false);
    expect(value('Số hiệu')).toBe('S1');
  });

  it('Hủy đóng form', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('OfficialDocForm - định dạng ngày theo cài đặt của web', () => {
  afterEach(() => localStorage.removeItem('app_date_format'));

  it.each([
    ['dd/mm/yyyy', '28/09/2026'],
    ['mm/dd/yyyy', '09/28/2026'],
    ['yyyy-mm-dd', '2026-09-28'],
  ])('định dạng %s hiển thị %s và nhập lại ra đúng ngày', async (format, shown) => {
    localStorage.setItem('app_date_format', format);
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <DateFormatProvider>
        <OfficialDocForm doc={{ ...existing, issuedDate: '2026-09-28', effectiveFrom: '2026-09-28', effectiveTo: null }} defaultCategory="van-ban" onSubmit={onSubmit} onClose={vi.fn()} />
      </DateFormatProvider>
    );
    expect(value('Ngày ban hành')).toBe(shown);
    expect(screen.getByLabelText('Ngày hết hiệu lực').getAttribute('placeholder')).toBe(format);

    fireEvent.change(screen.getByLabelText('Ngày hết hiệu lực'), { target: { value: format === 'dd/mm/yyyy' ? '31/12/2026' : format === 'mm/dd/yyyy' ? '12/31/2026' : '2026-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ issuedDate: '2026-09-28', effectiveTo: '2026-12-31' });
  });

  it('không còn ô ngày gốc của trình duyệt hiện theo ngôn ngữ máy', () => {
    setup();
    expect(document.querySelectorAll('input[type="date"]:not(.sr-only)').length).toBe(0);
  });
});

describe('OfficialDocForm - sửa', () => {
  it('nạp sẵn dữ liệu của văn bản, không tự đổi ngày hiệu lực khi sửa ngày ban hành', () => {
    setup(existing);
    expect(screen.getByRole('dialog', { name: 'Sửa văn bản' })).toBeTruthy();
    expect(value('Số hiệu')).toBe('CV-1');
    expect(value('Mục')).toBe('cong-van');
    expect(value('Ngày hiệu lực')).toBe('10/05/2026');
    expect(screen.getByText('cv.pdf')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Ngày ban hành'), { target: { value: '02/05/2026' } });
    expect(value('Ngày hiệu lực')).toBe('10/05/2026');
  });

  it('xóa ngày hết hiệu lực gửi null', async () => {
    const { onSubmit } = setup(existing);
    fireEvent.change(screen.getByLabelText('Ngày hết hiệu lực'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu văn bản' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ docNumber: 'CV-1', effectiveTo: null });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('id');
  });
});
