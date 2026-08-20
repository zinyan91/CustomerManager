// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { WorkProvider } from '../../context/WorkContext';
import { ROUTE_OF, DEFAULT_ROUTE, screenIdOfPath } from '../../lib/routes';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test' } },
    user: { id: 'test', email: 'test@nganhang.vn' },
    role: 'banker',
    fullName: 'Nguyễn Văn Thử',
    isAdmin: false,
    loading: false,
    signIn: async () => {},
    signOut: async () => {},
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { AppLayout as AppLayoutDuoiTest } from '../AppLayout';

vi.mock('../views/DashboardView', () => ({ DashboardView: () => <div>MAN:dashboard</div> }));
vi.mock('../views/CustomerListView', () => ({ CustomerListView: () => <div>MAN:customers</div> }));
vi.mock('../views/LoanPortfolioView', () => ({ LoanPortfolioView: () => <div>MAN:loans</div> }));
vi.mock('../views/CreditContractView', () => ({ CreditContractView: () => <div>MAN:credit-contracts</div> }));
vi.mock('../views/CollateralView', () => ({ CollateralView: () => <div>MAN:collaterals</div> }));
vi.mock('../views/CardContractView', () => ({ CardContractView: () => <div>MAN:credit-cards</div> }));
vi.mock('../views/CardPolicyLookupView', () => ({ CardPolicyLookupView: () => <div>MAN:card-policies</div> }));
vi.mock('../views/CalculatorView', () => ({ CalculatorView: () => <div>MAN:calculators</div> }));
vi.mock('../views/MdsdvLookupView', () => ({ MdsdvLookupView: () => <div>MAN:mdsdv</div> }));
vi.mock('../views/RateQuoteView', () => ({ RateQuoteView: () => <div>MAN:rate-quote</div> }));
vi.mock('../views/CofView', () => ({ CofView: () => <div>MAN:cof</div> }));
vi.mock('../views/DocumentTemplateView', () => ({ DocumentTemplateView: () => <div>MAN:templates</div> }));
vi.mock('../views/SettingsView', () => ({ SettingsView: () => <div>MAN:settings</div> }));
vi.mock('../views/PostLoanControlView', () => ({ PostLoanControlView: () => <div>MAN:post-loan</div> }));
vi.mock('../views/BusinessPlanView', () => ({ BusinessPlanView: () => <div>MAN:business-plan</div> }));
vi.mock('../views/InventoryView', () => ({ InventoryView: () => <div>MAN:inventory</div> }));
vi.mock('../views/PurchaseStatementView', () => ({ PurchaseStatementView: () => <div>MAN:purchase-statement</div> }));
vi.mock('../views/RetailInvoiceView', () => ({ RetailInvoiceView: () => <div>MAN:retail-invoice</div> }));
vi.mock('../views/QuizBankView', () => ({ QuizBankView: () => <div>MAN:quiz-bank</div> }));

import { App as AppThatDuoiTest } from '../../App';

afterEach(cleanup);

describe('bảng đường dẫn', () => {
  it('mọi đường dẫn tra ngược được ra màn', () => {
    for (const path of Object.values(ROUTE_OF)) {
      expect(screenIdOfPath(path), `${path} không tra ngược được`).toBeTruthy();
    }
  });

  it('màn mặc định là Tổng quan', () => {
    expect(DEFAULT_ROUTE).toBe('/dashboard');
  });
});

describe('AppLayout dựng được trong bộ định tuyến', () => {
  function dungLen(duongDan: string) {
    return render(
      <MemoryRouter initialEntries={[duongDan]}>
        <ThemeProvider>
          <LanguageProvider>
            <WorkProvider>
              <Routes>
                <Route element={<AppLayoutDuoiTest />}>
                  <Route path={ROUTE_OF.dashboard} element={<div>NOI DUNG MAN</div>} />
                  <Route path={ROUTE_OF.settings} element={<div>NOI DUNG MAN</div>} />
                </Route>
              </Routes>
            </WorkProvider>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  it('render khung và nội dung màn con, không ném lỗi', () => {
    dungLen(ROUTE_OF.dashboard);
    expect(screen.getByRole('navigation')).toBeTruthy();
    expect(screen.getByText('NOI DUNG MAN')).toBeTruthy();
  });

  it('đổi đường dẫn thì thanh bên đánh dấu đúng mục', () => {
    const { container } = dungLen(ROUTE_OF.settings);
    const dangMo = container.querySelector('[aria-current="page"]');
    expect(dangMo).toBeTruthy();
  });
});

describe('App thật — mỗi đường dẫn trong ROUTE_OF dựng đúng màn tương ứng', () => {
  function dungAppO(duongDan: string) {
    return render(
      <MemoryRouter initialEntries={[duongDan]}>
        <ThemeProvider>
          <LanguageProvider>
            <WorkProvider>
              <AppThatDuoiTest />
            </WorkProvider>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  it.each(Object.entries(ROUTE_OF))('đường dẫn %s dựng đúng màn', async (id, path) => {
    dungAppO(path);
    expect(await screen.findByText(`MAN:${id}`)).toBeTruthy();
  });
});
