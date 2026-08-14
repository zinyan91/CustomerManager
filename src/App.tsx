import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useWork } from './context/WorkContext';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { ErrorBoundary } from './components/ErrorBoundary';

// Dynamic Lazy Imports for All Views
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

const ViewFallback = () => (
  <div className="flex items-center justify-center h-64 text-ink/50">
    <Loader2 className="w-6 h-6 animate-spin text-accent mr-2" />
    <span className="text-xs">Đang tải giao diện...</span>
  </div>
);

export function App() {
  const { activeTab, setActiveTab } = useWork();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { session, loading } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleOpenCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleCloseCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface text-ink flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col antialiased">
      <Header
        onToggleMobileMenu={handleToggleMobileMenu}
        onOpenCommandPalette={handleOpenCommandPalette}
      />
      <div className="flex flex-1 pt-[var(--header-h)] relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={handleCloseMobileMenu}
        />
        <main className="flex-1 md:ml-60 min-w-0 bg-surface p-3 sm:p-4 md:p-6 overflow-y-auto">
          <ErrorBoundary title="Lỗi khi tải giao diện màn hình">
            <Suspense fallback={<ViewFallback />}>
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'customers' && <CustomerListView />}
              {activeTab === 'credit-contracts' && <CreditContractView />}
              {activeTab === 'loans' && <LoanPortfolioView />}
              {activeTab === 'collaterals' && <CollateralView />}
              {activeTab === 'credit-cards' && <CardContractView />}
              {activeTab === 'calculators' && <CalculatorView />}
              {activeTab === 'business-plan' && <BusinessPlanView />}
              {activeTab === 'inventory' && <InventoryView />}
              {activeTab === 'purchase-statement' && <PurchaseStatementView />}
              {activeTab === 'retail-invoice' && <RetailInvoiceView />}
              {activeTab === 'mdsdv' && <MdsdvLookupView />}
              {activeTab === 'card-policies' && <CardPolicyLookupView />}
              {activeTab === 'rate-quote' && <RateQuoteView />}
              {activeTab === 'cof' && <CofView />}
              {activeTab === 'templates' && <DocumentTemplateView />}
              {activeTab === 'quiz-bank' && <QuizBankView />}
              {activeTab === 'settings' && <SettingsView />}
              {activeTab === 'post-loan' && <PostLoanControlView />}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCloseCommandPalette}
      />
    </div>
  );
}

export default App;
