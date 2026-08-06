import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useWork } from './context/WorkContext';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { CustomerListView } from './components/views/CustomerListView';
import { LoanPortfolioView } from './components/views/LoanPortfolioView';
import { CreditContractView } from './components/views/CreditContractView';
import { CollateralView } from './components/views/CollateralView';
import { CreditCardView } from './components/views/CreditCardView';
import { CalculatorView } from './components/views/CalculatorView';
import { MdsdvLookupView } from './components/views/MdsdvLookupView';
import { RateQuoteView } from './components/views/RateQuoteView';
import { CofView } from './components/views/CofView';
import { DocumentTemplateView } from './components/views/DocumentTemplateView';
import { SettingsView } from './components/views/SettingsView';
import { PostLoanControlView } from './components/views/PostLoanControlView';

export function App() {
  const { activeTab, setActiveTab } = useWork();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { session, loading } = useAuth();

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
    <div className="min-h-screen bg-surface text-ink flex flex-col font-sans antialiased">
      <Header onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)} />
      <div className="flex flex-1 pt-[var(--header-h)] relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 md:ml-60 min-w-0 bg-surface p-3 sm:p-4 md:p-6 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'customers' && <CustomerListView />}
          {activeTab === 'credit-contracts' && <CreditContractView />}
          {activeTab === 'loans' && <LoanPortfolioView />}
          {activeTab === 'collaterals' && <CollateralView />}
          {activeTab === 'credit-cards' && <CreditCardView />}
          {activeTab === 'calculators' && <CalculatorView />}
          {activeTab === 'mdsdv' && <MdsdvLookupView />}
          {activeTab === 'rate-quote' && <RateQuoteView />}
          {activeTab === 'cof' && <CofView />}
          {activeTab === 'templates' && <DocumentTemplateView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'post-loan' && <PostLoanControlView />}
        </main>
      </div>
    </div>
  );
}

export default App;
