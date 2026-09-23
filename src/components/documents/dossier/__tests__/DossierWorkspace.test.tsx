// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UI } from '../../../../lib/uiClasses';
import { useDocumentDossierController } from '../../../../hooks/useDocumentDossierController';
import { DossierWorkspace } from '../DossierWorkspace';

afterEach(cleanup);

function Harness({ leading }: { leading?: React.ReactNode }) {
  const ctrl = useDocumentDossierController();
  return <DossierWorkspace styles={UI} ctrl={ctrl} leading={leading} />;
}

describe('DossierWorkspace', () => {
  it('thanh tiêu đề hiện tên biểu mẫu đang mở và vị trí trong bộ', () => {
    render(<Harness />);
    expect(screen.getByRole('heading', { name: 'HĐ Mua Bán Hàng Hóa' })).toBeTruthy();
    expect(screen.getByText('· 1/5')).toBeTruthy();
  });

  it('navigates with next and prev buttons', () => {
    render(<Harness />);
    const nextBtn = screen.getByRole('button', { name: 'Biểu mẫu tiếp theo' });
    fireEvent.click(nextBtn);
    expect(screen.getByRole('heading', { name: 'Bảng Kê Bán Hàng' })).toBeTruthy();
    expect(screen.getByText('· 2/5')).toBeTruthy();

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

  it('hiện phần leading ở đầu thanh tiêu đề', () => {
    render(<Harness leading={<button type="button">Mở cây</button>} />);
    expect(screen.getByRole('button', { name: 'Mở cây' })).toBeTruthy();
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

  it('bỏ tick Cam kết thì › từ Đề nghị TT (Bảng Kê) không sang Cam kết, và đếm chỉ tính giấy còn gồm', () => {
    render(<Loai />);
    fireEvent.click(screen.getByRole('button', { name: 'loại cam kết' }));
    const next = screen.getByRole('button', { name: 'Biểu mẫu tiếp theo' });
    fireEvent.click(next);
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByRole('heading', { name: 'Đề Nghị TT (Bảng Kê)' })).toBeTruthy();
    expect(screen.getByText('· 4/4')).toBeTruthy();
    expect((next as HTMLButtonElement).disabled).toBe(true);
  });
});
