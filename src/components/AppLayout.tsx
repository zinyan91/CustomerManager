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
    <div className="min-h-screen bg-surface text-ink flex flex-col antialiased">
      <Header
        onToggleMobileMenu={handleToggleMobileMenu}
        onOpenCommandPalette={handleOpenCommandPalette}
      />
      <div className="flex flex-1 pt-[var(--header-h)] relative">
        <Sidebar
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={handleCloseMobileMenu}
        />
        <main className="flex-1 md:ml-60 min-w-0 bg-surface p-3 sm:p-4 md:p-6 overflow-y-auto">
          <CustomerContextBar />
          <ErrorBoundary title="Lỗi khi tải giao diện màn hình">
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
