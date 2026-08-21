import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoginView } from './LoginView';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { ErrorBoundary } from './ErrorBoundary';
import { CustomerContextBar } from './CustomerContextBar';

export function AppLayout() {
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

  const handleToggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);
  const handleOpenCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const handleCloseMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const handleCloseCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);

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
    <div className="min-h-screen bg-surface text-ink flex flex-col antialiased relative overflow-x-hidden selection:bg-accent/20 selection:text-accent">
      {/* Dynamic Ambient Aurora Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[12%] -left-[5%] w-[60vw] h-[60vw] max-w-[750px] max-h-[750px] rounded-full bg-gradient-to-br from-accent/30 via-accent/12 to-transparent blur-[110px] pointer-events-none transform-gpu" />
        <div className="absolute top-[25%] -right-[12%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-bl from-kpi-cust/25 via-kpi-card/12 to-transparent blur-[120px] pointer-events-none transform-gpu" />
        <div className="absolute -bottom-[10%] left-[15%] w-[50vw] h-[50vw] max-w-[650px] max-h-[650px] rounded-full bg-gradient-to-tr from-pos/25 via-kpi-collateral/12 to-transparent blur-[130px] pointer-events-none transform-gpu" />
        <div className="absolute inset-0 bg-[radial-gradient(var(--color-line-strong)_1.2px,transparent_1.2px)] [background-size:32px_32px] opacity-[0.25] dark:opacity-[0.18] pointer-events-none" />
      </div>

      <Header
        onToggleMobileMenu={handleToggleMobileMenu}
        onOpenCommandPalette={handleOpenCommandPalette}
      />
      <div className="flex flex-1 pt-[56px] relative z-10 w-full">
        <Sidebar
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={handleCloseMobileMenu}
        />
        <main className="flex-1 md:ml-64 min-w-0 px-4 md:px-6 2xl:px-8 py-3.5 sm:py-4 overflow-y-auto relative z-10 w-full">
          <ErrorBoundary title="Lỗi khi tải giao diện màn hình">
            <CustomerContextBar />
            <Outlet />
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
