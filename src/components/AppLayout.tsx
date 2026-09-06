import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router';
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
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      {/* High-Performance Subtle Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(var(--color-line-strong)_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.15] dark:opacity-[0.10] pointer-events-none" />
      </div>

      <Header
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={handleToggleMobileMenu}
        onOpenCommandPalette={handleOpenCommandPalette}
      />

      <Sidebar
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={handleCloseMobileMenu}
      />

      <div className="flex flex-1 pt-[56px] relative w-full">
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
