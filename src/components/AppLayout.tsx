import { useState, useEffect, useCallback, Fragment } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserScope } from '../context/UserScopeContext';
import { SidebarCollapseProvider, useSidebarCollapse } from '../context/SidebarCollapseContext';
import { LoginView } from './LoginView';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { PrimaryRail } from './PrimaryRail';
import { CommandPalette } from './CommandPalette';
import { ErrorBoundary } from './ErrorBoundary';
import { CustomerContextBar } from './CustomerContextBar';
import { ModuleGate } from './ModuleGate';
import { AiChatDialog, FloatingAiAssistantButton } from './ai/AiChatDialog';
import { workspaceSectionOfPath } from '../lib/workspaceNavigation';

function AppLayoutContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const { session, loading, can } = useAuth();
  const isMasterAdmin = can('role.manage');
  const { ready, scopeKey } = useUserScope();
  const location = useLocation();
  const section = workspaceSectionOfPath(location.pathname);
  const directWorkspace = section === 'dispatch' || section === 'storage';
  const replacesSidebar = section === 'documents' || directWorkspace;
  const continuousWorkspace = ['retail','dispatch','storage','documents','reference','finance','admin'].includes(section ?? '')
    || /^(\/customers\/\d+)?\/loans(?:\/|$)/.test(location.pathname)
    || ['/hub/reports','/tools/reports'].includes(location.pathname.replace(/\/+$/,''));
  const flushReport = ['/team-kpi','/loan-progress','/dispatches','/storage'].includes(location.pathname.replace(/\/+$/,''));
  const { isSidebarCollapsed } = useSidebarCollapse();

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
        showUserScope={section !== 'admin'}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={handleToggleMobileMenu}
        onOpenCommandPalette={handleOpenCommandPalette}
        onOpenAiChat={() => setIsAiDialogOpen(true)}
      />

      <PrimaryRail isMasterAdmin={isMasterAdmin} />

      {(!replacesSidebar || isMobileMenuOpen) && <Sidebar
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={handleCloseMobileMenu}
        isMasterAdmin={isMasterAdmin}
        contextual={true}
        overlay={replacesSidebar}
      />}

      <div className="flex flex-1 pt-[56px] relative w-full">
        <main className={`flex-1 ${isSidebarCollapsed || directWorkspace ? 'md:ml-[88px]' : 'md:ml-[308px]'} transition-[margin] duration-200 min-w-0 ${flushReport || continuousWorkspace ? 'p-0' : 'px-4 md:px-6 2xl:px-8 py-3.5 sm:py-4'} ${continuousWorkspace ? 'workspace-continuous bg-panel' : ''} overflow-y-auto relative w-full`}>
          <ErrorBoundary title="Lỗi khi tải giao diện màn hình">
            {ready ? (
              // key = phạm vi tài khoản: đổi tài khoản thì remount để mọi màn nạp lại đúng dữ liệu
              <Fragment key={scopeKey}>
                <ModuleGate>
                  {section !== 'admin' && <CustomerContextBar />}
                  <Outlet />
                </ModuleGate>
              </Fragment>
            ) : (
              <div className="flex justify-center py-16" role="status" aria-label="Đang nạp phạm vi dữ liệu">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            )}
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCloseCommandPalette}
        isMasterAdmin={isMasterAdmin}
      />

      {/* Nút tròn nổi mở Trợ lý AI ở góc màn hình */}
      <FloatingAiAssistantButton onClick={() => setIsAiDialogOpen(true)} />

      {/* Cửa sổ Trợ lý AI */}
      <AiChatDialog
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        mode="drawer"
      />
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarCollapseProvider>
      <AppLayoutContent />
    </SidebarCollapseProvider>
  );
}
