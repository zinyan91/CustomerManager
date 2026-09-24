// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CollateralTable } from '../collateral/CollateralTable';
import type { Collateral, Customer } from '../../types';

afterEach(cleanup);

const ts = [
  { Id: 3, CustomerId: 7, AssetCode: 'TS-03', AssetType: 'BĐS - Loại 1', AppraisedValue: 1_000_000_000 },
  { Id: 4, CustomerId: 7, AssetCode: 'TS-04', AssetType: 'BĐS - Loại 1', AppraisedValue: 500_000_000 },
] as Collateral[];

function dung(mortgageNumbersOf?: (id: number) => string[]) {
  render(
    <CollateralTable
      filteredCollaterals={ts}
      paginatedCollaterals={ts}
      customers={[{ Id: 7, FullName: 'NGÔ NHỊ ĐẠT' } as Customer]}
      selectedCollateral={null}
      handleSelectRow={() => {}}
      colPage={1}
      setColPage={() => {}}
      totalPages={1}
      onDelete={() => {}}
      deletingId={null}
      mortgageNumbersOf={mortgageNumbersOf}
    />
  );
}

describe('CollateralTable — cột HĐTC', () => {
  it('có cột HĐTC, ghi số HĐTC đang chứa tài sản; tài sản không nằm trong HĐTC nào ghi "—"', () => {
    dung(id => (id === 3 ? ['HĐTC-01', 'HĐTC-02'] : []));
    expect(screen.getByRole('columnheader', { name: 'HĐTC' })).toBeTruthy();
    expect(screen.getByText('HĐTC-01, HĐTC-02')).toBeTruthy();
  });

  it('dòng tổng cuối bảng vẫn phủ đủ số cột', () => {
    dung(() => []);
    const soCot = screen.getAllByRole('columnheader').length;
    const hangTong = screen.getByText(/TỔNG CỘNG TRANG HIỆN HÀNH/).closest('tr')!;
    const tong = Array.from(hangTong.children).reduce((s, td) => s + Number((td as HTMLTableCellElement).colSpan || 1), 0);
    expect(tong).toBe(soCot);
  });
});
