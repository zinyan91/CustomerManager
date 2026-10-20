// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { ROUTE_OF, DEFAULT_ROUTE, screenIdOfPath } from '../../lib/routes';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test' } },
    user: { id: 'test', email: 'test@nganhang.vn' },
    role: 'user',
    fullName: 'Nguyễn Văn Thử',
    isAdmin: false,
    can: () => false,
    roleLoading: false,
    loading: false,
    signIn: async () => {},
    signOut: async () => {},
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../context/ModulesContext', async () => {
  const { MODULE_IDS } = await import('../../lib/modules');
  const value = { allowed: [...MODULE_IDS], ready: true, error: null, reload: () => {} };
  return { useModules: () => value, ModulesProvider: ({ children }: { children: React.ReactNode }) => children };
});

import { AppLayout as AppLayoutDuoiTest } from '../AppLayout';

vi.mock('../views/DashboardView', () => ({ DashboardView: () => <div>MAN:dashboard</div> }));
vi.mock('../views/CustomerListView', () => ({ CustomerListView: () => <div>MAN:customers</div> }));
vi.mock('../views/DisbursementPayeeListView', () => ({ DisbursementPayeeListView: () => <div>MAN:disbursement</div> }));
vi.mock('../views/LoanPortfolioView', () => ({ LoanPortfolioView: () => <div>MAN:loans</div> }));
vi.mock('../views/CreditContractView', () => ({ CreditContractView: () => <div>MAN:credit-contracts</div> }));
vi.mock('../views/CollateralView', () => ({ CollateralView: () => <div>MAN:collaterals</div> }));
vi.mock('../views/MortgageContractView', () => ({ MortgageContractView: () => <div>MAN:mortgage-contracts</div> }));
vi.mock('../views/CardContractView', () => ({ CardContractView: () => <div>MAN:credit-cards</div> }));
vi.mock('../views/DispatchManagementView', () => ({ DispatchManagementView: () => <div>MAN:dispatches</div> }));
vi.mock('../views/StorageManagementView', () => ({ StorageManagementView: () => <div>MAN:storage</div> }));
vi.mock('../views/CardPolicyLookupView', () => ({ CardPolicyLookupView: () => <div>MAN:card-policies</div> }));
vi.mock('../views/CalculatorView', () => ({ CalculatorView: () => <div>MAN:calculators</div> }));
vi.mock('../views/MdsdvLookupView', () => ({ MdsdvLookupView: () => <div>MAN:mdsdv</div> }));
vi.mock('../views/RateQuoteView', () => ({ RateQuoteView: () => <div>MAN:rate-quote</div> }));
vi.mock('../views/CofView', () => ({ CofView: () => <div>MAN:cof</div> }));
vi.mock('../views/ReportCenterView', () => ({ ReportCenterView: () => <div>MAN:reports</div> }));
vi.mock('../views/DocumentTemplateView', () => ({ DocumentTemplateView: () => <div>MAN:templates</div> }));
vi.mock('../views/SettingsView', () => ({ SettingsView: () => <div>MAN:settings</div> }));
vi.mock('../views/PostLoanControlView', () => ({ PostLoanControlView: () => <div>MAN:post-loan</div> }));
vi.mock('../views/BusinessPlanView', () => ({ BusinessPlanView: () => <div>MAN:business-plan</div> }));
vi.mock('../views/CorporateFinancialView', () => ({ CorporateFinancialView: () => <div>MAN:corporate-financial</div> }));
vi.mock('../views/InventoryView', () => ({ InventoryView: () => <div>MAN:inventory</div> }));
vi.mock('../views/ShoppingChecklistView', () => ({ ShoppingChecklistView: () => <div>MAN:shopping-checklist</div> }));
vi.mock('../views/PurchaseStatementView', () => ({ PurchaseStatementView: () => <div>MAN:purchase-statement</div> }));
vi.mock('../views/RetailInvoiceView', () => ({ RetailInvoiceView: () => <div>MAN:retail-invoice</div> }));
vi.mock('../views/QuizBankView', () => ({ QuizBankView: () => <div>MAN:quiz-bank</div> }));
vi.mock('../views/WorkspaceHubView', () => ({ WorkspaceHubView: () => <div>MAN:hub</div> }));
vi.mock('../views/ConstructionEstimateView', () => ({ ConstructionEstimateView: () => <div>MAN:estimate</div> }));
vi.mock('../admin/AdminLayout', () => ({ AdminLayout: () => <div>MAN:admin</div> }));
vi.mock('../views/ToiProjectionView', () => ({ ToiProjectionView: () => <div>MAN:toi</div> }));
vi.mock('../../office/OfficeLayout', () => ({ OfficeLayout: () => <div>MAN:office</div>, OfficeIndex: () => <div>MAN:office</div> }));

import { App as AppThatDuoiTest } from '../../App';

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy?.mockRestore();
  cleanup();
});

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
            <Routes>
              <Route element={<AppLayoutDuoiTest />}>
                <Route path={ROUTE_OF.dashboard} element={<div>NOI DUNG MAN</div>} />
                <Route path={ROUTE_OF.settings} element={<div>NOI DUNG MAN</div>} />
              </Route>
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  it('render khung và nội dung màn con, không ném lỗi', () => {
    dungLen(ROUTE_OF.dashboard);
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
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
            <AppThatDuoiTest />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  it.each(Object.entries(ROUTE_OF))('đường dẫn %s dựng đúng màn', async (id, path) => {
    dungAppO(path);
    expect(await screen.findByText(`MAN:${id==='hub' ? 'mdsdv' : id}`)).toBeTruthy();
  });
  it.each(['/hub/mdsdv','/hub/card-fees','/hub/quiz','/hub/documents','/hub/cof','/hub/toi','/hub/estimate','/hub/reports','/dispatches','/storage'])('%s uses the shared navigation instead of the catalog shell',async path=>{
    const {container}=dungAppO(path);
    await screen.findByText(/^MAN:/);
    expect(screen.getByRole('navigation',{name:'Phân hệ'})).toBeTruthy();
    if (['/hub/documents','/dispatches','/storage'].includes(path)) expect(container.querySelector('#app-sidebar')).toBeNull();
    else expect(container.querySelector('#app-sidebar')).toBeTruthy();
    expect(screen.queryByText('Danh Mục Tác Vụ Độc Lập')).toBeNull();
    expect(screen.queryByRole('button',{name:'Danh mục'})).toBeNull();
  });
});

describe('tuyến lồng theo khách hàng', () => {
  function dungAppO(duongDan: string) {
    return render(
      <MemoryRouter initialEntries={[duongDan]}>
        <ThemeProvider>
          <LanguageProvider>
            <AppThatDuoiTest />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  const CAP = [
    ['/customers/55/credit-contracts', 'credit-contracts'],
    ['/customers/55/loans', 'loans'],
    ['/customers/55/collaterals', 'collaterals'],
    ['/customers/55/mortgage-contracts', 'mortgage-contracts'],
    ['/customers/55/credit-cards', 'credit-cards'],
    ['/customers/55/post-loan-control', 'post-loan'],
  ] as const;

  it.each(CAP)('%s dựng đúng màn %s', async (path, id) => {
    dungAppO(path);
    expect(await screen.findByText(`MAN:${id}`)).toBeTruthy();
  });

  it('đường lồng lạ vẫn về Tổng quan, không màn trắng', async () => {
    dungAppO('/customers/55/khong-co-man-nay');
    expect(await screen.findByText('MAN:dashboard')).toBeTruthy();
  });

  it('Id không phải số vẫn khớp tuyến lồng, không rơi về Tổng quan', async () => {
    dungAppO('/customers/abc/loans');
    expect(await screen.findByText('MAN:loans')).toBeTruthy();
  });
});
