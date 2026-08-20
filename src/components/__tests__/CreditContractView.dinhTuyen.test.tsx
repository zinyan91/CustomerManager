// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([
    { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' },
    { Id: 77, FullName: 'Lê Văn C', CifKh: '900077' },
  ]),
  fetchCreditContractsByCustomerAPI: async () => [],
  fetchContractsByCustomerAPI: async () => [],
  fetchCollateralsByCustomerAPI: async () => [],
  fetchRepaymentSchedulesAPI: async () => [],
  saveCreditContractAPI: async () => ({}),
  deleteCreditContractAPI: async () => {},
  countKunnOfCreditContractAPI: async () => 0,
}));

import { CreditContractView } from '../views/CreditContractView';

function ViTri() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

afterEach(cleanup);

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/credit-contracts" element={<><CreditContractView /><ViTri /></>} />
        <Route path="/customers/:customerId/credit-contracts" element={<><CreditContractView /><ViTri /></>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CreditContractView lấy khách từ URL', () => {
  it('chọn khách thì đường dẫn đổi sang đường lồng', async () => {
    dungLenO('/credit-contracts');
    const o = await screen.findByRole('combobox');
    fireEvent.change(o, { target: { value: '77' } });
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/customers/77/credit-contracts'));
  });

  it('bỏ chọn khách thì về đường phẳng', async () => {
    dungLenO('/customers/55/credit-contracts');
    const o = await screen.findByRole('combobox');
    fireEvent.change(o, { target: { value: '' } });
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/credit-contracts'));
  });

  it('vào thẳng đường lồng thì ô chọn đã sẵn đúng khách', async () => {
    dungLenO('/customers/55/credit-contracts');
    await waitFor(() => {
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('55');
    });
  });
});
