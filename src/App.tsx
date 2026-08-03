import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { CustomerListView } from './components/views/CustomerListView';
import { LoanPortfolioView } from './components/views/LoanPortfolioView';
import { CollateralView } from './components/views/CollateralView';
import { CreditCardView } from './components/views/CreditCardView';
import { CalculatorView } from './components/views/CalculatorView';
import { DocumentTemplateView } from './components/views/DocumentTemplateView';
import { SettingsView } from './components/views/SettingsView';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme } = useTheme();
  const { session, loading } = useAuth();

  const bgClass = theme === 'light'
    ? 'bg-slate-50 text-slate-900'
    : 'bg-slate-950 text-slate-100';

  const mainClass = theme === 'light'
    ? 'bg-slate-100'
    : '';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgClass} flex items-center justify-center`}>
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div className={`min-h-screen ${bgClass} flex flex-col font-sans antialiased transition-colors duration-200`}>
      <Header onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)} />
      <div className="flex flex-1 pt-[53px] md:pt-[57px] relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main className={`flex-1 md:ml-60 min-w-0 p-3 sm:p-4 md:p-6 overflow-y-auto ${mainClass}`}>
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'customers' && <CustomerListView />}
          {activeTab === 'loans' && <LoanPortfolioView />}
          {activeTab === 'collaterals' && <CollateralView />}
          {activeTab === 'credit-cards' && <CreditCardView />}
          {activeTab === 'calculators' && <CalculatorView />}
          {activeTab === 'templates' && <DocumentTemplateView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'post-loan' && (
            <div className="p-6 md:p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              🔒 Phân hệ Kiểm Soát Sau Vay & Giám Sát Tín Dụng đang được tích hợp quy trình chấm điểm định kỳ.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
