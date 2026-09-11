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
  it('shows dropdown trigger with the current document and allows selecting documents from dropdown', () => {
    render(<Harness />);
    // Current active document label is shown in trigger and heading
    expect(screen.getByRole('button', { name: 'Chọn biểu mẫu' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'HĐ Mua Bán Hàng Hóa' })).toBeTruthy();

    // Open dropdown to see all templates in dossier
    fireEvent.click(screen.getByRole('button', { name: 'Chọn biểu mẫu' }));
    expect(screen.getByRole('button', { name: /HĐ Mua Bán Hàng Hóa/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Đề Nghị TT \(Mua Bán\)/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Giấy Cam Kết/i })).toBeTruthy();
  });

  it('switching to Đề nghị TT changes the preview title', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Chọn biểu mẫu' }));
    fireEvent.click(screen.getByRole('button', { name: /Đề Nghị TT \(Mua Bán\)/i }));
    expect(screen.getByRole('heading', { name: 'Đề Nghị TT (Mua Bán)' })).toBeTruthy();
  });

  it('navigates with next and prev buttons', () => {
    render(<Harness />);
    const nextBtn = screen.getByRole('button', { name: 'Biểu mẫu tiếp theo' });
    fireEvent.click(nextBtn);
    expect(screen.getByRole('heading', { name: 'Bảng Kê Bán Hàng' })).toBeTruthy();

    const prevBtn = screen.getByRole('button', { name: 'Biểu mẫu trước' });
    fireEvent.click(prevBtn);
    expect(screen.getByRole('heading', { name: 'HĐ Mua Bán Hàng Hóa' })).toBeTruthy();
  });

  it('switching to Bảng Kê Bán Hàng renders Excel export button in StandaloneDocPreview', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Chọn biểu mẫu' }));
    fireEvent.click(screen.getByRole('button', { name: /Bảng Kê Bán Hàng/i }));
    expect(screen.getByRole('heading', { name: 'Bảng Kê Bán Hàng' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lưu dạng Excel (.xlsx)' })).toBeTruthy();
  });

  it('allows selecting documents directly via horizontal tab strip', () => {
    render(<Harness />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(4);

    // Click tab 2 (Bảng Kê Bán Hàng) directly
    fireEvent.click(tabs[1]);
    expect(screen.getByRole('heading', { name: 'Bảng Kê Bán Hàng' })).toBeTruthy();
  });
});
