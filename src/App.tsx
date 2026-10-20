import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { LegacyHubRedirect } from './components/hub/LegacyHubRedirect';
import { ViewSkeleton } from './components/SkeletonLoader';
import { ROUTE_OF, DEFAULT_ROUTE } from './lib/routes';

const DashboardView = lazy(() => import('./components/views/DashboardView').then(m => ({ default: m.DashboardView })));
const TeamKpiView = lazy(() => import('./components/views/TeamKpiView').then(m => ({ default: m.TeamKpiView })));
const LoanProgressView = lazy(() => import('./components/views/LoanProgressView').then(m => ({ default: m.LoanProgressView })));
const CustomerListView = lazy(() => import('./components/views/CustomerListView').then(m => ({ default: m.CustomerListView })));
const DisbursementPayeeListView = lazy(() => import('./components/views/DisbursementPayeeListView').then(m => ({ default: m.DisbursementPayeeListView })));
const LoanPortfolioView = lazy(() => import('./components/views/LoanPortfolioView').then(m => ({ default: m.LoanPortfolioView })));
const CreditContractView = lazy(() => import('./components/views/CreditContractView').then(m => ({ default: m.CreditContractView })));
const CollateralView = lazy(() => import('./components/views/CollateralView').then(m => ({ default: m.CollateralView })));
const MortgageContractView = lazy(() => import('./components/views/MortgageContractView').then(m => ({ default: m.MortgageContractView })));
const CardContractView = lazy(() => import('./components/views/CardContractView').then(m => ({ default: m.CardContractView })));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminOverviewView = lazy(() => import('./components/views/AdminOverviewView').then(m => ({ default: m.AdminOverviewView })));
const CustomerTransferView = lazy(() => import('./components/views/CustomerTransferView').then(m => ({ default: m.CustomerTransferView })));
const StorageConfigView = lazy(() => import('./components/views/StorageConfigView').then(m => ({ default: m.StorageConfigView })));
const UserModulesView = lazy(() => import('./components/views/UserModulesView').then(m => ({ default: m.UserModulesView })));
const UserManagementView = lazy(() => import('./components/views/UserManagementView').then(m => ({ default: m.UserManagementView })));
const AdminTeamsView = lazy(() => import('./components/views/AdminTeamsView').then(m => ({ default: m.AdminTeamsView })));
const AdminKpiDataView = lazy(() => import('./components/views/AdminKpiDataView').then(m => ({ default: m.AdminKpiDataView })));
const DispatchManagementView = lazy(() => import('./components/views/DispatchManagementView').then(m => ({ default: m.DispatchManagementView })));
const CardPolicyLookupView = lazy(() => import('./components/views/CardPolicyLookupView').then(m => ({ default: m.CardPolicyLookupView })));
const CalculatorView = lazy(() => import('./components/views/CalculatorView').then(m => ({ default: m.CalculatorView })));
const MdsdvLookupView = lazy(() => import('./components/views/MdsdvLookupView').then(m => ({ default: m.MdsdvLookupView })));
const RateQuoteView = lazy(() => import('./components/views/RateQuoteView').then(m => ({ default: m.RateQuoteView })));
const CofView = lazy(() => import('./components/views/CofView').then(m => ({ default: m.CofView })));
const DocumentTemplateView = lazy(() => import('./components/views/DocumentTemplateView').then(m => ({ default: m.DocumentTemplateView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then(m => ({ default: m.SettingsView })));
const PostLoanControlView = lazy(() => import('./components/views/PostLoanControlView').then(m => ({ default: m.PostLoanControlView })));
const BusinessPlanView = lazy(() => import('./components/views/BusinessPlanView').then(m => ({ default: m.BusinessPlanView })));
const CorporateFinancialView = lazy(() => import('./components/views/CorporateFinancialView').then(m => ({ default: m.CorporateFinancialView })));
const InventoryView = lazy(() => import('./components/views/InventoryView').then(m => ({ default: m.InventoryView })));
const ShoppingChecklistView = lazy(() => import('./components/views/ShoppingChecklistView').then(m => ({ default: m.ShoppingChecklistView })));
const PurchaseStatementView = lazy(() => import('./components/views/PurchaseStatementView').then(m => ({ default: m.PurchaseStatementView })));
const RetailInvoiceView = lazy(() => import('./components/views/RetailInvoiceView').then(m => ({ default: m.RetailInvoiceView })));
const QuizBankView = lazy(() => import('./components/views/QuizBankView').then(m => ({ default: m.QuizBankView })));
const ConstructionEstimateView = lazy(() => import('./components/views/ConstructionEstimateView').then(m => ({ default: m.ConstructionEstimateView })));
const ReportCenterView = lazy(() => import('./components/views/ReportCenterView').then(m => ({ default: m.ReportCenterView })));
const ToiProjectionView = lazy(() => import('./components/views/ToiProjectionView').then(m => ({ default: m.ToiProjectionView })));
const OfficeLayout = lazy(() => import('./office/OfficeLayout').then(m => ({ default: m.OfficeLayout })));
const OfficeIndex = lazy(() => import('./office/OfficeLayout').then(m => ({ default: m.OfficeIndex })));
const OfficeCalcRoute = lazy(() => import('./office/OfficeCalcRoute').then(m => ({ default: m.OfficeCalcRoute })));
const OfficeWriterRoute = lazy(() => import('./office/OfficeWriterRoute').then(m => ({ default: m.OfficeWriterRoute })));
const StorageManagementView = lazy(() => import('./components/views/StorageManagementView').then(m => ({ default: m.StorageManagementView })));

export function App() {
  return (
    <Routes>
      {/* Báo cáo (bảng tính kiểu Excel): trang trống toàn màn hình, không sidebar */}
      <Route path={ROUTE_OF.office} element={<Suspense fallback={<ViewSkeleton />}><OfficeLayout /></Suspense>}>
        <Route index element={<Suspense fallback={<ViewSkeleton />}><OfficeIndex /></Suspense>} />
        <Route path="calc" element={<Suspense fallback={<ViewSkeleton />}><OfficeCalcRoute /></Suspense>} />
        <Route path="calc/shared/:sharedId" element={<Suspense fallback={<ViewSkeleton />}><OfficeCalcRoute /></Suspense>} />
        <Route path="calc/:draftId" element={<Suspense fallback={<ViewSkeleton />}><OfficeCalcRoute /></Suspense>} />
        <Route path="writer" element={<Suspense fallback={<ViewSkeleton />}><OfficeWriterRoute /></Suspense>} />
        <Route path="writer/shared/:sharedId" element={<Suspense fallback={<ViewSkeleton />}><OfficeWriterRoute /></Suspense>} />
        <Route path="writer/:draftId" element={<Suspense fallback={<ViewSkeleton />}><OfficeWriterRoute /></Suspense>} />
      </Route>

      {/* Khu quản trị: khung và sidebar riêng, mở ở tab mới */}
      <Route path={ROUTE_OF.admin} element={<Suspense fallback={<ViewSkeleton />}><AdminLayout /></Suspense>}>
        <Route index element={<Suspense fallback={<ViewSkeleton />}><AdminOverviewView /></Suspense>} />
        <Route path="users" element={<Suspense fallback={<ViewSkeleton />}><UserManagementView /></Suspense>} />
        <Route path="teams" element={<Suspense fallback={<ViewSkeleton />}><AdminTeamsView /></Suspense>} />
        <Route path="kpi" element={<Suspense fallback={<ViewSkeleton />}><AdminKpiDataView /></Suspense>} />
        <Route path="users/:userId" element={<Suspense fallback={<ViewSkeleton />}><UserModulesView /></Suspense>} />
        <Route path="transfer" element={<Suspense fallback={<ViewSkeleton />}><CustomerTransferView /></Suspense>} />
        <Route path="storage" element={<Suspense fallback={<ViewSkeleton />}><StorageConfigView /></Suspense>} />
      </Route>

      {/* Giao diện CRM chính có Sidebar hệ thống */}
      <Route element={<AppLayout />}>
        <Route path={ROUTE_OF.hub} element={<Suspense fallback={<ViewSkeleton />}><LegacyHubRedirect /></Suspense>} />
        <Route path="/hub/documents" element={<Suspense fallback={<ViewSkeleton />}><DocumentTemplateView /></Suspense>} />
        <Route path="/hub/estimate" element={<Suspense fallback={<ViewSkeleton />}><ConstructionEstimateView /></Suspense>} />
        <Route path="/hub/toi" element={<Suspense fallback={<ViewSkeleton />}><ToiProjectionView /></Suspense>} />
        <Route path="/hub/disbursement" element={<Suspense fallback={<ViewSkeleton />}><DisbursementPayeeListView /></Suspense>} />
        <Route path="/hub/mdsdv" element={<Suspense fallback={<ViewSkeleton />}><MdsdvLookupView /></Suspense>} />
        <Route path="/hub/card-fees" element={<Suspense fallback={<ViewSkeleton />}><CardPolicyLookupView /></Suspense>} />
        <Route path="/hub/corporate-financial" element={<Suspense fallback={<ViewSkeleton />}><CorporateFinancialView /></Suspense>} />
        <Route path="/hub/shopping" element={<Suspense fallback={<ViewSkeleton />}><ShoppingChecklistView /></Suspense>} />
        <Route path="/hub/invoice" element={<Suspense fallback={<ViewSkeleton />}><RetailInvoiceView /></Suspense>} />
        <Route path="/hub/statement" element={<Suspense fallback={<ViewSkeleton />}><PurchaseStatementView /></Suspense>} />
        <Route path="/hub/quiz" element={<Suspense fallback={<ViewSkeleton />}><QuizBankView /></Suspense>} />
        <Route path="/hub/cof" element={<Suspense fallback={<ViewSkeleton />}><CofView /></Suspense>} />
        <Route path="/hub/reports" element={<Suspense fallback={<ViewSkeleton />}><ReportCenterView /></Suspense>} />
        <Route path={ROUTE_OF.dispatches} element={<Suspense fallback={<ViewSkeleton />}><DispatchManagementView /></Suspense>} />
        <Route path={ROUTE_OF.storage} element={<Suspense fallback={<ViewSkeleton />}><StorageManagementView /></Suspense>} />
        <Route path="/hub/dispatches" element={<Navigate to={ROUTE_OF.dispatches} replace />} />
        <Route path="/hub/storage" element={<Navigate to={ROUTE_OF.storage} replace />} />
        <Route index element={<Navigate to={DEFAULT_ROUTE} replace />} />
        <Route path={ROUTE_OF.dashboard} element={<Suspense fallback={<ViewSkeleton />}><DashboardView /></Suspense>} />
        <Route path="/team-kpi" element={<Suspense fallback={<ViewSkeleton />}><TeamKpiView /></Suspense>} />
        <Route path="/loan-progress" element={<Suspense fallback={<ViewSkeleton />}><LoanProgressView /></Suspense>} />
        <Route path={ROUTE_OF.customers} element={<Suspense fallback={<ViewSkeleton />}><CustomerListView /></Suspense>} />
        <Route path={ROUTE_OF.disbursement} element={<Navigate to="/hub/disbursement" replace />} />
        <Route path={ROUTE_OF['credit-contracts']} element={<Suspense fallback={<ViewSkeleton />}><CreditContractView /></Suspense>} />
        <Route path={ROUTE_OF.loans} element={<Suspense fallback={<ViewSkeleton />}><LoanPortfolioView /></Suspense>} />
        <Route path={ROUTE_OF.collaterals} element={<Suspense fallback={<ViewSkeleton />}><CollateralView /></Suspense>} />
        <Route path={ROUTE_OF['mortgage-contracts']} element={<Suspense fallback={<ViewSkeleton />}><MortgageContractView /></Suspense>} />
        <Route path={ROUTE_OF['credit-cards']} element={<Suspense fallback={<ViewSkeleton />}><CardContractView /></Suspense>} />
        <Route path={ROUTE_OF.calculators} element={<Suspense fallback={<ViewSkeleton />}><CalculatorView /></Suspense>} />
        <Route path={ROUTE_OF['business-plan']} element={<Suspense fallback={<ViewSkeleton />}><BusinessPlanView /></Suspense>} />
        <Route path={ROUTE_OF['corporate-financial']} element={<Navigate to="/hub/corporate-financial" replace />} />
        <Route path={ROUTE_OF.inventory} element={<Suspense fallback={<ViewSkeleton />}><InventoryView /></Suspense>} />
        <Route path={ROUTE_OF['rate-quote']} element={<Suspense fallback={<ViewSkeleton />}><RateQuoteView /></Suspense>} />
        <Route path={ROUTE_OF.cof} element={<Navigate to="/hub/cof" replace />} />
        <Route path={ROUTE_OF.reports} element={<Navigate to="/hub/reports" replace />} />
        <Route path={ROUTE_OF['quiz-bank']} element={<Navigate to="/hub/quiz" replace />} />
        <Route path={ROUTE_OF['post-loan']} element={<Suspense fallback={<ViewSkeleton />}><PostLoanControlView /></Suspense>} />
        <Route path="/users" element={<Navigate to="/admin/users" replace />} />
        <Route path={ROUTE_OF.settings} element={<Suspense fallback={<ViewSkeleton />}><SettingsView /></Suspense>} />


        <Route path={ROUTE_OF.templates} element={<Navigate to="/hub/documents" replace />} />
        <Route path={ROUTE_OF.mdsdv} element={<Navigate to="/hub/mdsdv" replace />} />
        <Route path={ROUTE_OF['card-policies']} element={<Navigate to="/hub/card-fees" replace />} />
        <Route path={ROUTE_OF['shopping-checklist']} element={<Navigate to="/hub/shopping" replace />} />
        <Route path={ROUTE_OF['retail-invoice']} element={<Navigate to="/hub/invoice" replace />} />
        <Route path={ROUTE_OF['purchase-statement']} element={<Navigate to="/hub/statement" replace />} />
        <Route path={`/customers/:customerId${ROUTE_OF['credit-contracts']}`} element={<Suspense fallback={<ViewSkeleton />}><CreditContractView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF.loans}`} element={<Suspense fallback={<ViewSkeleton />}><LoanPortfolioView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF.loans}/:kunnId/schedule`} element={<Suspense fallback={<ViewSkeleton />}><LoanPortfolioView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF.collaterals}`} element={<Suspense fallback={<ViewSkeleton />}><CollateralView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF['mortgage-contracts']}`} element={<Suspense fallback={<ViewSkeleton />}><MortgageContractView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF['credit-cards']}`} element={<Suspense fallback={<ViewSkeleton />}><CardContractView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF['post-loan']}`} element={<Suspense fallback={<ViewSkeleton />}><PostLoanControlView /></Suspense>} />
        <Route path="/customers/:customerId/profile" element={<Suspense fallback={<ViewSkeleton />}><CustomerListView /></Suspense>} />
        <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
      </Route>
    </Routes>
  );
}

export default App;
