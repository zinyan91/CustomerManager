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
