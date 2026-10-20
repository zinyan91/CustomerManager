// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UI } from '../../../../lib/uiClasses';
import { useDocumentDossierController } from '../../../../hooks/useDocumentDossierController';
import { DossierWorkspace } from '../DossierWorkspace';

afterEach(cleanup);

function Harness() {
  const ctrl = useDocumentDossierController();
  return <DossierWorkspace styles={UI} ctrl={ctrl} />;
}

describe('DossierWorkspace', () => {
  it('ô chọn và bản xem trước khớp biểu mẫu đang mở', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'HĐ Mua Bán Hàng Hóa' })).toBeTruthy();
    expect((screen.getByLabelText('Biểu mẫu') as HTMLSelectElement).value).toBe('sale_contract');
  });

  it('navigates with next and prev buttons', () => {
    render(<Harness />);
    const nextBtn = screen.getByRole('button', { name: 'Biểu mẫu tiếp theo' });
    fireEvent.click(nextBtn);
    expect(screen.getByRole('heading', { name: 'Bảng Kê Bán Hàng' })).toBeTruthy();
    expect((screen.getByLabelText('Biểu mẫu') as HTMLSelectElement).value).toBe('bang_ke');

    const prevBtn = screen.getByRole('button', { name: 'Biểu mẫu trước' });
    fireEvent.click(prevBtn);
    expect(screen.getByRole('heading', { name: 'HĐ Mua Bán Hàng Hóa' })).toBeTruthy();
  });

  it('switching to Bảng Kê Bán Hàng renders Excel export button in StandaloneDocPreview', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Biểu mẫu tiếp theo' }));
    expect(screen.getByRole('heading', { name: 'Bảng Kê Bán Hàng' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lưu dạng Excel (.xlsx)' })).toBeTruthy();
  });

  it('chọn bộ hồ sơ ngay trên thanh ngang', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Bộ hồ sơ'),{target:{value:'cho_thue'}});
    expect((screen.getByLabelText('Bộ hồ sơ') as HTMLSelectElement).value).toBe('cho_thue');
  });
});

describe('DossierWorkspace — ‹ › bỏ qua giấy tờ đã loại', () => {
  function Loai() {
    const ctrl = useDocumentDossierController();
    return (
      <>
        <button type="button" onClick={() => ctrl.toggleOptional('cam_ket')}>loại cam kết</button>
        <DossierWorkspace styles={UI} ctrl={ctrl} />
      </>
    );
  }

  it('bỏ tick Cam kết thì › dừng ở Đề nghị TT (Bảng Kê)', () => {
    render(<Loai />);
    fireEvent.click(screen.getByRole('button', { name: 'loại cam kết' }));
    const next = screen.getByRole('button', { name: 'Biểu mẫu tiếp theo' });
    fireEvent.click(next);
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByRole('heading', { name: 'Đề Nghị TT (Bảng Kê)' })).toBeTruthy();
    expect((screen.getByLabelText('Biểu mẫu') as HTMLSelectElement).value).toBe('payment_request_bang_ke');
    expect((next as HTMLButtonElement).disabled).toBe(true);
  });
});
