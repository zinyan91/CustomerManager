import React from 'react';
import { Outlet, useLocation } from 'react-router';
import { ROUTE_OF } from '../../lib/routes';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoginView } from '../LoginView';
import { DedicatedWorkspaceHeader } from './DedicatedWorkspaceHeader';
import { ErrorBoundary } from '../ErrorBoundary';
import { CustomerContextBar } from '../CustomerContextBar';
import { ModuleGate } from '../ModuleGate';

export const DedicatedWorkspaceLayout: React.FC = () => {
  const { session, loading } = useAuth();
  const { pathname } = useLocation();
  // Văn thư và Kho lưu trữ tự quản bố cục toàn màn hình: không chừa lề ngoài
  const fullBleed = pathname === ROUTE_OF.dispatches || pathname === ROUTE_OF.storage;

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
    <div className="min-h-screen bg-surface text-ink flex flex-col antialiased relative selection:bg-accent/20 selection:text-accent font-app">
      {/* High-Performance Subtle Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(var(--color-line-strong)_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.12] dark:opacity-[0.08] pointer-events-none" />
      </div>

      {/* Top Standalone Header with Direct Tabs */}
      <DedicatedWorkspaceHeader />

      {/* Standalone Workspace Content (100% Full Width, No Left Sidebar) */}
      <main className={`flex-1 w-full min-w-0 overflow-y-auto relative ${fullBleed ? '' : 'px-3 sm:px-6 2xl:px-8 py-3.5 sm:py-5'}`}>
        <ErrorBoundary title="Lỗi khi tải giao diện tác vụ">
          <ModuleGate>
            <CustomerContextBar />
            <Outlet />
          </ModuleGate>
        </ErrorBoundary>
      </main>
    </div>
  );
};
