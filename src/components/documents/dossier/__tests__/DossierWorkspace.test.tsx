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
  it('shows tabs for each document in the dossier', () => {
    render(<Harness />);
    // Query the tab buttons specifically: the active tab label also appears in the
    // preview heading, so a plain getByText would match multiple nodes.
    expect(screen.getByRole('button', { name: 'HĐ Mua Bán Hàng Hóa' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đề Nghị TT (Mua Bán)' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Giấy Cam Kết' })).toBeTruthy();
  });

  it('switching to Đề nghị TT changes the preview title', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Đề Nghị TT (Mua Bán)' }));
    expect(screen.getByRole('heading', { name: 'Đề Nghị TT (Mua Bán)' })).toBeTruthy();
  });
});
