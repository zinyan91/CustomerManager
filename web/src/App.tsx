import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { CustomerListView } from './components/views/CustomerListView';
import { LoanPortfolioView } from './components/views/LoanPortfolioView';
import { CollateralView } from './components/views/CollateralView';
import { CreditCardView } from './components/views/CreditCardView';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'customers':
        return <CustomerListView />;
      case 'loans':
        return <LoanPortfolioView />;
      case 'collaterals':
        return <CollateralView />;
      case 'credit-cards':
        return <CreditCardView />;
      case 'post-loan':
        return (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3">
            <h3 className="text-lg font-bold text-sky-400">PHÂN HỆ KIỂM SOÁT SAU VAY & ĐIỀU KIỆN PHÊ DUYỆT</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Theo dõi CASA, Dòng tiền giao dịch, Đợt kiểm tra sau vay định kỳ gần nhất và tiếp theo.
            </p>
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 overflow-y-auto bg-slate-950/90 min-h-[calc(100vh-61px)]">
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}

export default App;
