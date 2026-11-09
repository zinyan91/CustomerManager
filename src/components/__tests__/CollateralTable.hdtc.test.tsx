// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { CollateralTable } from '../collateral/CollateralTable';
import type { Collateral, Customer } from '../../types';
import type { DisplayAppraisalStatus } from '../../lib/collateralUsage';

afterEach(cleanup);

const ts = [
  { Id: 3, CustomerId: 7, AssetCode: 'TS-03', AssetType: 'BĐS - Loại 1', AppraisedValue: 1_000_000_000 },
  { Id: 4, CustomerId: 7, AssetCode: 'TS-04', AssetType: 'BĐS - Loại 1', AppraisedValue: 500_000_000 },
] as Collateral[];

function dung(mortgageNumbersOf?: (id: number) => string[], statusOf: (c: Collateral) => DisplayAppraisalStatus = () => 'valid') {
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
      statusOf={statusOf}
    />
  );
}

describe('CollateralTable — trạng thái định giá', () => {
  it('tài sản đã tất toán hiện "Đã tất toán", không hiện "Hết hiệu lực"; tài sản đang bảo đảm vẫn cảnh báo', () => {
    dung(() => [], c => (c.Id === 3 ? 'released' : 'expired'));
    expect(screen.getAllByText('Đã tất toán')).toHaveLength(1);
    expect(screen.getAllByText('Hết hiệu lực')).toHaveLength(1);
  });
});

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
