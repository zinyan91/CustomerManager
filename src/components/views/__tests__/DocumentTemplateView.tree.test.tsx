// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { DocumentTemplateView } from '../DocumentTemplateView';

afterEach(() => { cleanup(); localStorage.clear(); });

const cay = () => screen.queryByRole('navigation', { name: 'Bộ hồ sơ' });

describe('Soạn hồ sơ — cây bộ hồ sơ', () => {
  it('không còn hàng tab biểu mẫu và popover Chọn biểu mẫu', () => {
    render(<DocumentTemplateView />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Chọn biểu mẫu' })).toBeNull();
    expect(cay()).toBeTruthy();
  });

  it('bấm thư mục rồi bấm biểu mẫu thì bản xem trước đổi theo', () => {
    render(<DocumentTemplateView />);
    const nav = within(cay()!);
    fireEvent.click(nav.getByRole('button', { name: 'Vận hành tập trung' }));
    fireEvent.click(nav.getByRole('button', { name: 'BM02 - Tờ trình giải ngân' }));
    expect(screen.getByRole('heading', { name: 'BM02 - Tờ trình giải ngân' })).toBeTruthy();
  });

  it('chuyển qua lại giữa hai bộ bằng cây', () => {
    render(<DocumentTemplateView />);
    const nav = within(cay()!);
    fireEvent.click(nav.getByRole('button', { name: 'Vận hành tập trung' }));
    fireEvent.click(nav.getByRole('button', { name: 'BM01 - Giấy đề nghị giải ngân' }));
    fireEvent.click(nav.getByRole('button', { name: 'HĐ Mua Bán Hàng Hóa' }));
    expect(screen.getByRole('heading', { name: 'HĐ Mua Bán Hàng Hóa' })).toBeTruthy();
    fireEvent.click(nav.getByRole('button', { name: 'BM01 - Giấy đề nghị giải ngân' }));
    expect(screen.getByRole('heading', { name: 'BM01 - Giấy đề nghị giải ngân' })).toBeTruthy();
  });

  it('Cam kết ở hai thư mục đang mở có ô tick riêng theo tên bộ', () => {
    render(<DocumentTemplateView />);
    fireEvent.click(within(cay()!).getByRole('button', { name: 'Hồ sơ sửa chữa nhà' }));
    expect(within(cay()!).getAllByRole('button', { name: 'Giấy Cam Kết' })).toHaveLength(2);
    expect(within(cay()!).getByRole('checkbox', { name: 'Gồm Giấy Cam Kết (Hồ sơ sửa chữa nhà)' })).toBeTruthy();
  });

  it('bỏ tick gồm ở bộ sửa chữa nhà không ảnh hưởng bộ giải ngân', () => {
    render(<DocumentTemplateView />);
    fireEvent.click(within(cay()!).getByRole('button', { name: 'Hồ sơ sửa chữa nhà' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Gồm Giấy Cam Kết (Hồ sơ sửa chữa nhà)' }));
    expect((screen.getByRole('checkbox', { name: 'Gồm Giấy Cam Kết (Hồ sơ sửa chữa nhà)' }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: 'Gồm Giấy Cam Kết (Hồ sơ giải ngân)' }) as HTMLInputElement).checked).toBe(true);
    const [laGiaiNgan, laSuaNha] = within(cay()!).getAllByRole('button', { name: 'Giấy Cam Kết' }) as HTMLButtonElement[];
    expect(laGiaiNgan.disabled).toBe(false);
    expect(laSuaNha.disabled).toBe(true);
  });

  it('ẩn cây, mở lại, và nhớ trạng thái ẩn khi mở lại màn', () => {
    const { unmount } = render(<DocumentTemplateView />);
    fireEvent.click(screen.getByRole('button', { name: 'Ẩn Bộ hồ sơ' }));
    expect(cay()).toBeNull();
    unmount();
    render(<DocumentTemplateView />);
    expect(cay()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Hiện cây hồ sơ' }));
    expect(cay()).toBeTruthy();
  });

  it('màn hẹp: nút mở cây thành ngăn kéo, chọn biểu mẫu thì đóng, Esc cũng đóng', () => {
    const cu = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      render(<DocumentTemplateView />);
      fireEvent.click(screen.getByRole('button', { name: 'Ẩn Bộ hồ sơ' }));
      fireEvent.click(screen.getByRole('button', { name: 'Hiện cây hồ sơ' }));
      expect(cay()).toBeTruthy();
      fireEvent.click(within(cay()!).getByRole('button', { name: 'Bảng Kê Bán Hàng' }));
      expect(cay()).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Hiện cây hồ sơ' }));
      expect(cay()).toBeTruthy();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(cay()).toBeNull();
    } finally {
      window.matchMedia = cu;
    }
  });
});

describe('Soạn hồ sơ — ngăn kéo màn hẹp', () => {
  const hep = () => {
    const cu = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    return () => { window.matchMedia = cu; };
  };

  it('ngăn kéo gắn thẳng vào body để không bị thanh đầu trang của khung hub đè lên', () => {
    const tra = hep();
    try {
      const { container } = render(<DocumentTemplateView />);
      fireEvent.click(screen.getByRole('button', { name: 'Ẩn Bộ hồ sơ' }));
      fireEvent.click(screen.getByRole('button', { name: 'Hiện cây hồ sơ' }));
      expect(cay()).toBeTruthy();
      expect(container.contains(cay())).toBe(false);
      expect(cay()!.parentElement).toBe(document.body);
    } finally {
      tra();
    }
  });

  it('bấm « trong ngăn kéo chỉ đóng ngăn kéo, không lưu trạng thái ẩn cho màn rộng', () => {
    const tra = hep();
    try {
      localStorage.setItem('cm_doc_tree_collapsed', '0');
      render(<DocumentTemplateView />);
      fireEvent.click(screen.getByRole('button', { name: 'Hiện cây hồ sơ' }));
      const ngan = screen.getAllByRole('navigation', { name: 'Bộ hồ sơ' }).find(n => n.parentElement === document.body)!;
      fireEvent.click(within(ngan).getByRole('button', { name: 'Ẩn Bộ hồ sơ' }));
      expect(screen.getAllByRole('navigation', { name: 'Bộ hồ sơ' }).some(n => n.parentElement === document.body)).toBe(false);
      expect(localStorage.getItem('cm_doc_tree_collapsed')).toBe('0');
    } finally {
      tra();
    }
  });
});
