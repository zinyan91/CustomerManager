import React, { useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Custom Hooks (SRP & SoC)
import { useAuth } from './src/hooks/useAuth';
import { usePortfolioData } from './src/hooks/usePortfolioData';
import { useCustomerModal } from './src/hooks/useCustomerModal';

// Components & Modals
import { LoginScreen } from './src/components/LoginScreen';
import { SidebarDrawer, ActiveWindow } from './src/components/SidebarDrawer';
import { Customer360Modal } from './src/components/Customer360Modal';
import { WindowHeader } from './src/components/WindowHeader';
import { CalculatorModule } from './src/components/CalculatorModule';
import { RateQuoteModule } from './src/components/RateQuoteModule';
import { QuizModule } from './src/components/QuizModule';

// Dedicated Full-Screen Views
import { HomeHubView } from './src/views/HomeHubView';
import { CustomerListView } from './src/views/CustomerListView';
import { LoanListView } from './src/views/LoanListView';
import { CreditListView } from './src/views/CreditListView';
import { CardListView } from './src/views/CardListView';
import { CollateralListView } from './src/views/CollateralListView';
import { PostLoanListView } from './src/views/PostLoanListView';
import { DueAlertsView } from './src/views/DueAlertsView';

// Common Styles
import { commonStyles } from './src/theme/styles';

export default function App() {
  // 1. Auth Hook
  const { session, authLoading, userFullName, loggingIn, login, logout } = useAuth();

  // 2. Active Window Navigation
  const [activeWindow, setActiveWindow] = useState<ActiveWindow>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 3. Customer 360 Details Modal Hook
  const {
    selectedCustomer,
    customerLoans,
    customerCredits,
    customerCollaterals,
    customerCards,
    loadingDetails,
    openCustomer,
    closeCustomer,
  } = useCustomerModal();

  // 4. Portfolio Data Hook
  const {
    customers,
    loanContracts,
    creditContracts,
    collaterals,
    cardContracts,
    postLoanRecords,
    loading: portfolioLoading,
    refreshing,
    onRefresh,
    searchQuery,
    setSearchQuery,
    totalOutstandingBalance,
    totalCreditLimit,
    totalCollateralValue,
    dueData,
    filteredCustomers,
    filteredLoans,
    filteredCredits,
    filteredCards,
    filteredCollaterals,
    filteredPostLoans,
  } = usePortfolioData(!!session);

  const navigateTo = (win: ActiveWindow) => {
    setActiveWindow(win);
    setSidebarOpen(false);
    setSearchQuery('');
  };

  // Auth Loading Splash
  if (authLoading) {
    return (
      <View style={commonStyles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={commonStyles.loadingText}>Đang khởi động ứng dụng...</Text>
      </View>
    );
  }

  // Unauthenticated State
  if (!session) {
    return <LoginScreen loggingIn={loggingIn} onLogin={login} />;
  }

  // Main Authenticated Workspace
  return (
    <View style={commonStyles.container}>
      <StatusBar style="dark" />

      {/* 1. Home Hub View */}
      {activeWindow === 'home' ? (
        <HomeHubView
          totalOutstandingBalance={totalOutstandingBalance}
          totalCreditLimit={totalCreditLimit}
          totalCollateralValue={totalCollateralValue}
          customerCount={customers.length}
          loanCount={loanContracts.length}
          creditCount={creditContracts.length}
          cardCount={cardContracts.length}
          collateralCount={collaterals.length}
          postLoanCount={postLoanRecords.length}
          totalDueAlerts={dueData.totalDueAlerts}
          dueInMonthCount={dueData.dueInMonthList.length}
          dueKunnCount={dueData.dueKunnList.length}
          refreshing={refreshing}
          userFullName={userFullName}
          onRefresh={onRefresh}
          onOpenSidebar={() => setSidebarOpen(true)}
          onNavigate={navigateTo}
        />
      ) : activeWindow === 'customers' ? (
        <CustomerListView
          customers={filteredCustomers}
          searchQuery={searchQuery}
          refreshing={refreshing}
          onSearchChange={setSearchQuery}
          onRefresh={onRefresh}
          onBack={() => navigateTo('home')}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectCustomer={openCustomer}
        />
      ) : activeWindow === 'kunn' ? (
        <LoanListView
          loans={filteredLoans}
          searchQuery={searchQuery}
          refreshing={refreshing}
          onSearchChange={setSearchQuery}
          onRefresh={onRefresh}
          onBack={() => navigateTo('home')}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectCustomer={openCustomer}
        />
      ) : activeWindow === 'hdtd' ? (
        <CreditListView
          credits={filteredCredits}
          searchQuery={searchQuery}
          refreshing={refreshing}
          onSearchChange={setSearchQuery}
          onRefresh={onRefresh}
          onBack={() => navigateTo('home')}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectCustomer={openCustomer}
        />
      ) : activeWindow === 'cards' ? (
        <CardListView
          cards={filteredCards}
          searchQuery={searchQuery}
          refreshing={refreshing}
          onSearchChange={setSearchQuery}
          onRefresh={onRefresh}
          onBack={() => navigateTo('home')}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectCustomer={openCustomer}
        />
      ) : activeWindow === 'collaterals' ? (
        <CollateralListView
          collaterals={filteredCollaterals}
          searchQuery={searchQuery}
          refreshing={refreshing}
          onSearchChange={setSearchQuery}
          onRefresh={onRefresh}
          onBack={() => navigateTo('home')}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectCustomer={openCustomer}
        />
      ) : activeWindow === 'postloan' ? (
        <PostLoanListView
          records={filteredPostLoans}
          searchQuery={searchQuery}
          refreshing={refreshing}
          onSearchChange={setSearchQuery}
          onRefresh={onRefresh}
          onBack={() => navigateTo('home')}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectCustomer={openCustomer}
        />
      ) : activeWindow === 'dues' ? (
        <DueAlertsView
          dueData={dueData}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onBack={() => navigateTo('home')}
          onOpenSidebar={() => setSidebarOpen(true)}
          onSelectCustomer={openCustomer}
        />
      ) : activeWindow === 'calculator' ? (
        <View style={{ flex: 1 }}>
          <WindowHeader
            title="Công cụ tính phương án vay"
            onBack={() => navigateTo('home')}
            onOpenSidebar={() => setSidebarOpen(true)}
            showSearch={false}
          />
          <CalculatorModule />
        </View>
      ) : activeWindow === 'ratequote' ? (
        <View style={{ flex: 1 }}>
          <WindowHeader
            title="Bảng biểu báo giá lãi suất"
            onBack={() => navigateTo('home')}
            onOpenSidebar={() => setSidebarOpen(true)}
            showSearch={false}
          />
          <RateQuoteModule />
        </View>
      ) : activeWindow === 'quiz' ? (
        <View style={{ flex: 1 }}>
          <WindowHeader
            title="Bộ đề ôn tập nghiệp vụ"
            onBack={() => navigateTo('home')}
            onOpenSidebar={() => setSidebarOpen(true)}
            showSearch={false}
          />
          <QuizModule />
        </View>
      ) : null}

      {/* Customer 360 Bottom Sheet Modal */}
      <Customer360Modal
        customer={selectedCustomer}
        customerLoans={customerLoans}
        customerCredits={customerCredits}
        customerCollaterals={customerCollaterals}
        customerCards={customerCards}
        loading={loadingDetails}
        onClose={closeCustomer}
      />

      {/* Sidebar Drawer Navigation */}
      <SidebarDrawer
        visible={sidebarOpen}
        activeWindow={activeWindow}
        userFullName={userFullName}
        onSelectWindow={navigateTo}
        onClose={() => setSidebarOpen(false)}
        onLogout={logout}
      />
    </View>
  );
}
