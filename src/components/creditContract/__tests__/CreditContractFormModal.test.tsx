// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CreditContractFormModal } from '../CreditContractFormModal';
import type { CreditContract } from '../../../types';

afterEach(cleanup);

const cu = { Id: 23, CustomerId: 1, HdtdNumber: 'HDTD-CU', ContractAmount: 2_450_000_000, ContractEndDate: '2026-07-08' } as CreditContract;

function renderForm(renewalOptions: CreditContract[], form: Partial<CreditContract> = {}) {
  const setForm = vi.fn();
  render(
    <CreditContractFormModal
      isOpen editing={null} form={form} setForm={setForm}
      formAmount="" setFormAmount={vi.fn()} formApprovalAmount="" setFormApprovalAmount={vi.fn()}
      useSharedApproval={false} setUseSharedApproval={vi.fn()}
      selectedCollateralIds={[]} setSelectedCollateralIds={vi.fn()} collaterals={[]}
      purposeOptions={[]} tongKhaNangBaoDam={0} vuotKhaNangBaoDam={false}
      renewalOptions={renewalOptions} onSave={vi.fn()} onClose={vi.fn()}
    />,
  );
  return setForm;
}

describe('CreditContractFormModal — tái tục', () => {
  it('chọn HĐTD cũ thì ghi RenewsCreditContractId; chọn "Không tái tục" thì về null', () => {
    const setForm = renderForm([cu]);
    const select = screen.getByLabelText('Tái tục từ HĐTD') as HTMLSelectElement;
    expect(select.textContent).toContain('HDTD-CU');
    fireEvent.change(select, { target: { value: '23' } });
    expect(setForm).toHaveBeenLastCalledWith(expect.objectContaining({ RenewsCreditContractId: 23 }));
    fireEvent.change(select, { target: { value: '' } });
    expect(setForm).toHaveBeenLastCalledWith(expect.objectContaining({ RenewsCreditContractId: null }));
  });

  it('khách chưa có HĐTD nào khác thì không hiện ô tái tục', () => {
    renderForm([]);
    expect(screen.queryByLabelText('Tái tục từ HĐTD')).toBeNull();
  });
});
