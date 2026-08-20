import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { ViewSkeleton } from './components/SkeletonLoader';
import { ROUTE_OF, DEFAULT_ROUTE } from './lib/routes';

const DashboardView = lazy(() => import('./components/views/DashboardView').then(m => ({ default: m.DashboardView })));
const CustomerListView = lazy(() => import('./components/views/CustomerListView').then(m => ({ default: m.CustomerListView })));
const LoanPortfolioView = lazy(() => import('./components/views/LoanPortfolioView').then(m => ({ default: m.LoanPortfolioView })));
const CreditContractView = lazy(() => import('./components/views/CreditContractView').then(m => ({ default: m.CreditContractView })));
const CollateralView = lazy(() => import('./components/views/CollateralView').then(m => ({ default: m.CollateralView })));
const CardContractView = lazy(() => import('./components/views/CardContractView').then(m => ({ default: m.CardContractView })));
const CardPolicyLookupView = lazy(() => import('./components/views/CardPolicyLookupView').then(m => ({ default: m.CardPolicyLookupView })));
const CalculatorView = lazy(() => import('./components/views/CalculatorView').then(m => ({ default: m.CalculatorView })));
const MdsdvLookupView = lazy(() => import('./components/views/MdsdvLookupView').then(m => ({ default: m.MdsdvLookupView })));
const RateQuoteView = lazy(() => import('./components/views/RateQuoteView').then(m => ({ default: m.RateQuoteView })));
const CofView = lazy(() => import('./components/views/CofView').then(m => ({ default: m.CofView })));
const DocumentTemplateView = lazy(() => import('./components/views/DocumentTemplateView').then(m => ({ default: m.DocumentTemplateView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then(m => ({ default: m.SettingsView })));
const PostLoanControlView = lazy(() => import('./components/views/PostLoanControlView').then(m => ({ default: m.PostLoanControlView })));
const BusinessPlanView = lazy(() => import('./components/views/BusinessPlanView').then(m => ({ default: m.BusinessPlanView })));
const InventoryView = lazy(() => import('./components/views/InventoryView').then(m => ({ default: m.InventoryView })));
const PurchaseStatementView = lazy(() => import('./components/views/PurchaseStatementView').then(m => ({ default: m.PurchaseStatementView })));
const RetailInvoiceView = lazy(() => import('./components/views/RetailInvoiceView').then(m => ({ default: m.RetailInvoiceView })));
const QuizBankView = lazy(() => import('./components/views/QuizBankView').then(m => ({ default: m.QuizBankView })));

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={DEFAULT_ROUTE} replace />} />
        <Route path={ROUTE_OF.dashboard} element={<Suspense fallback={<ViewSkeleton />}><DashboardView /></Suspense>} />
        <Route path={ROUTE_OF.customers} element={<Suspense fallback={<ViewSkeleton />}><CustomerListView /></Suspense>} />
        <Route path={ROUTE_OF['credit-contracts']} element={<Suspense fallback={<ViewSkeleton />}><CreditContractView /></Suspense>} />
        <Route path={ROUTE_OF.loans} element={<Suspense fallback={<ViewSkeleton />}><LoanPortfolioView /></Suspense>} />
        <Route path={ROUTE_OF.collaterals} element={<Suspense fallback={<ViewSkeleton />}><CollateralView /></Suspense>} />
        <Route path={ROUTE_OF['credit-cards']} element={<Suspense fallback={<ViewSkeleton />}><CardContractView /></Suspense>} />
        <Route path={ROUTE_OF.calculators} element={<Suspense fallback={<ViewSkeleton />}><CalculatorView /></Suspense>} />
        <Route path={ROUTE_OF['business-plan']} element={<Suspense fallback={<ViewSkeleton />}><BusinessPlanView /></Suspense>} />
        <Route path={ROUTE_OF.inventory} element={<Suspense fallback={<ViewSkeleton />}><InventoryView /></Suspense>} />
        <Route path={ROUTE_OF['purchase-statement']} element={<Suspense fallback={<ViewSkeleton />}><PurchaseStatementView /></Suspense>} />
        <Route path={ROUTE_OF['retail-invoice']} element={<Suspense fallback={<ViewSkeleton />}><RetailInvoiceView /></Suspense>} />
        <Route path={ROUTE_OF['rate-quote']} element={<Suspense fallback={<ViewSkeleton />}><RateQuoteView /></Suspense>} />
        <Route path={ROUTE_OF.cof} element={<Suspense fallback={<ViewSkeleton />}><CofView /></Suspense>} />
        <Route path={ROUTE_OF.mdsdv} element={<Suspense fallback={<ViewSkeleton />}><MdsdvLookupView /></Suspense>} />
        <Route path={ROUTE_OF['card-policies']} element={<Suspense fallback={<ViewSkeleton />}><CardPolicyLookupView /></Suspense>} />
        <Route path={ROUTE_OF.templates} element={<Suspense fallback={<ViewSkeleton />}><DocumentTemplateView /></Suspense>} />
        <Route path={ROUTE_OF['quiz-bank']} element={<Suspense fallback={<ViewSkeleton />}><QuizBankView /></Suspense>} />
        <Route path={ROUTE_OF['post-loan']} element={<Suspense fallback={<ViewSkeleton />}><PostLoanControlView /></Suspense>} />
        <Route path={ROUTE_OF.settings} element={<Suspense fallback={<ViewSkeleton />}><SettingsView /></Suspense>} />
        <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
      </Route>
    </Routes>
  );
}

export default App;
