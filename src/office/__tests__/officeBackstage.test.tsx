// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../calc/services/calcDraftStore', () => ({
  listCalcDrafts: async () => [{ id: 'c1', title: 'Sổ cái', updatedAt: 5 }],
}));
vi.mock('../writer/services/draftStore', () => ({
  listDrafts: async () => [
    { id: 'w1', title: 'Tờ trình', updatedAt: 9 },
    { id: 'w2', title: '', updatedAt: 3 },
  ],
}));

import { LanguageProvider } from '../../context/LanguageContext';
import { Backstage } from '../calc/components/backstage/Backstage';
import { CalcController } from '../calc/controller';
import { WriterBackstage } from '../writer/components/WriterBackstage';

afterEach(cleanup);

const wrap = (node: React.ReactNode) => render(<LanguageProvider>{node}</LanguageProvider>);

function writerProps(over: Partial<React.ComponentProps<typeof WriterBackstage>> = {}): React.ComponentProps<typeof WriterBackstage> {
  return {
    title: 'Tờ trình số 5',
    savedAt: null,
    initial: 'home',
    archiveLink: null,
    notice: null,
    problem: null,
    stats: { words: 1234, chars: 5678, pages: 3 },
    onClose: vi.fn(),
    onHome: vi.fn(),
    onNew: vi.fn(),
    onOpenDevice: vi.fn(),
    onOpenDraft: vi.fn(),
    onOpenFromArchive: vi.fn(),
    onSaveNow: vi.fn(async () => {}),
    onSaveToArchive: vi.fn(async () => {}),
    onSaveToArchiveAs: vi.fn(),
    onDownloadDocx: vi.fn(),
    onDownloadHtml: vi.fn(),
    onDownloadTxt: vi.fn(),
    onPrint: vi.fn(),
    onError: vi.fn(),
    ...over,
  };
}

describe('màn Tệp của Văn bản', () => {
  it('Trang chủ: văn bản trống mở văn bản mới; danh sách gần đây là nháp văn bản, mới nhất trước, nháp không tên có tên mặc định', async () => {
    const props = writerProps();
    wrap(<WriterBackstage {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Văn bản trống' }));
    expect(props.onNew).toHaveBeenCalled();
    const list = await screen.findByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items[0].textContent).toContain('Tờ trình');
    expect(items[1].textContent).toContain('Tài liệu không tên');
    fireEvent.click(within(items[0]).getByRole('button'));
    expect(props.onOpenDraft).toHaveBeenCalledWith('w1');
  });

  it('Mở: có mở từ máy và mở từ Kho lưu trữ', () => {
    const props = writerProps({ initial: 'open' });
    wrap(<WriterBackstage {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Mở tệp từ máy/ }));
    fireEvent.click(screen.getByRole('button', { name: /Mở từ Kho lưu trữ/ }));
    expect(props.onOpenDevice).toHaveBeenCalled();
    expect(props.onOpenFromArchive).toHaveBeenCalled();
  });

  it('Thông tin: tên, số từ, ký tự, trang và đường dẫn kho khi đã gắn tệp', () => {
    wrap(<WriterBackstage {...writerProps({ initial: 'info', archiveLink: { rootId: 'r', fileId: 'f', path: 'VB/to-trinh.docx' } })} />);
    const info = document.querySelector('.calc-info')!.textContent!;
    expect(info).toContain('Tờ trình số 5');
    expect(info).toContain('VB/to-trinh.docx');
    expect(info).toContain('Chưa lưu');
    expect(info).toMatch(/1[.,]234/);
    expect(info).toContain('3');
  });

  it('Lưu: lưu bản nháp ngay báo đã lưu; chưa gắn tệp thì không có "vị trí khác", đã gắn thì có', async () => {
    const props = writerProps({ initial: 'save' });
    const { rerender } = wrap(<WriterBackstage {...props} />);
    expect(screen.queryByRole('button', { name: /vị trí khác/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu bản nháp ngay' }));
    expect(await screen.findByText('Đã lưu bản nháp.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Lưu vào Kho lưu trữ/ }));
    expect(props.onSaveToArchive).toHaveBeenCalled();
    rerender(
      <LanguageProvider>
        <WriterBackstage {...props} archiveLink={{ rootId: 'r', fileId: 'f', path: 'a.docx' }} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /vị trí khác/ }));
    expect(props.onSaveToArchiveAs).toHaveBeenCalled();
  });

  it('Lưu thành: ba định dạng tải xuống; In: nút in', () => {
    const props = writerProps({ initial: 'saveAs' });
    const { unmount } = wrap(<WriterBackstage {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /\.docx/ }));
    fireEvent.click(screen.getByRole('button', { name: /\.html/ }));
    fireEvent.click(screen.getByRole('button', { name: /\.txt/ }));
    expect([props.onDownloadDocx, props.onDownloadHtml, props.onDownloadTxt].every((f) => (f as ReturnType<typeof vi.fn>).mock.calls.length === 1)).toBe(true);
    unmount();
    const printProps = writerProps({ initial: 'print' });
    wrap(<WriterBackstage {...printProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'In / Lưu PDF' }));
    expect(printProps.onPrint).toHaveBeenCalled();
  });

  it('Esc và mũi tên quay lại tài liệu; Đóng về trang chủ; lỗi và thông báo hiện ở đầu màn', () => {
    const props = writerProps({ problem: 'Hỏng rồi', notice: 'Đã lưu vào Kho' });
    wrap(<WriterBackstage {...props} />);
    expect(screen.getByRole('alert').textContent).toBe('Hỏng rồi');
    expect(screen.getByRole('status').textContent).toBe('Đã lưu vào Kho');
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại bảng tính' }));
    expect(props.onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /Đóng, về trang chủ/ }));
    expect(props.onHome).toHaveBeenCalled();
  });
});

describe('màn Tệp của Bảng tính sau khi tách khung dùng chung', () => {
  const calcProps = (over: Partial<React.ComponentProps<typeof Backstage>> = {}): React.ComponentProps<typeof Backstage> => ({
    controller: new CalcController(),
    title: 'Sổ cái',
    savedAt: null,
    initial: 'home',
    archiveLink: null,
    notice: null,
    problem: null,
    onSaveToArchive: vi.fn(async () => {}),
    onSaveToArchiveAs: vi.fn(),
    onOpenFromArchive: vi.fn(),
    onClose: vi.fn(),
    onNew: vi.fn(),
    onOpenDevice: vi.fn(),
    onOpenDraft: vi.fn(),
    onSaveNow: vi.fn(async () => {}),
    onDownloadXlsx: vi.fn(),
    onDownloadCsv: vi.fn(),
    onHome: vi.fn(),
    onMessage: vi.fn(),
    ...over,
  });

  it('chuyển mục bằng danh mục bên trái, đúng nội dung từng mục', async () => {
    const props = calcProps();
    wrap(<Backstage {...props} />);
    expect(await screen.findByText('Sổ cái')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bảng tính trống' }));
    expect(props.onNew).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Mở' }));
    expect(screen.getByRole('button', { name: /Mở từ Kho lưu trữ/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thông tin' }));
    expect(document.querySelector('.calc-info')!.textContent).toContain('Trang tính');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thành' }));
    fireEvent.click(screen.getByRole('button', { name: /\.csv/ }));
    expect(props.onDownloadCsv).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
  });
});
