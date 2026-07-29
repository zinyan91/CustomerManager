import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { CustomerListView } from './components/views/CustomerListView';
import { LoanPortfolioView } from './components/views/LoanPortfolioView';
import { CollateralView } from './components/views/CollateralView';
import { CreditCardView } from './components/views/CreditCardView';
import { SettingsView } from './components/views/SettingsView';

export function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      <Header />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'customers' && <CustomerListView />}
          {activeTab === 'loans' && <LoanPortfolioView />}
          {activeTab === 'collaterals' && <CollateralView />}
          {activeTab === 'credit-cards' && <CreditCardView />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'post-loan' && (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
              🔒 Phân hệ Kiểm Soát Sau Vay & Giám Sát Tín Dụng đang được tích hợp quy trình chấm điểm định kỳ.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
