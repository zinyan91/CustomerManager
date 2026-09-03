import { memo, useEffect } from 'react';
import { NavLink } from 'react-router';
import { X, Sparkles } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { NAV_GROUPS } from '../lib/navigation';
import { APP_VERSION } from '../lib/appVersion';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { screenPathFor } from '../lib/customerRoutes';

interface SidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar = memo<SidebarProps>(({
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { t } = useLang();
  const customerId = useSelectedCustomerId();

  useEffect(() => {
    if (!isOpenMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpenMobile, onCloseMobile]);

  useEffect(() => {
    if (isOpenMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpenMobile]);

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 md:top-[56px] bottom-0 left-0 z-50 md:z-30 w-72 max-w-[85vw] md:w-64 bg-panel border-r border-line/70 flex flex-col shrink-0 transition-transform duration-200 ease-in-out shadow-2xl md:shadow-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        aria-label="Sidebar Navigation"
      >
        <div className="flex items-center justify-between p-3.5 md:hidden border-b border-line/60 bg-panel">
          <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Menu Hệ Thống
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-xl text-ink-faint hover:text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
            aria-label={t('header.closeMenu')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3.5 space-y-4 overscroll-contain">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.groupKey} className={gi === 0 ? '' : 'pt-2 border-t border-line/40'}>
              <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-accent/60" />
                <span>{t(group.groupKey)}</span>
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const to = screenPathFor(item.id, customerId);
                  const ketThuc = item.id === 'customers';
                  return (
                    <NavLink
                      key={item.id}
                      to={to}
                      end={ketThuc}
                      onClick={onCloseMobile}
                      className={({ isActive }) => `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-accent group ${
                        isActive
                          ? 'bg-accent text-accent-ink font-bold shadow-md shadow-accent/25'
                          : 'text-ink-muted hover:text-ink hover:bg-surface/70 font-medium'
                      }`}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                            isActive ? 'text-accent-ink' : 'text-ink-faint group-hover:text-accent'
                          }`} />
                          <span className="truncate">{t(item.labelKey)}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line/50 p-3 flex items-center justify-between bg-surface/40 md:rounded-b-2xl">
          <span className="text-[10px] uppercase tracking-[0.12em] font-semibold text-ink-faint">{t('header.version')}</span>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-panel border border-line/60 text-accent font-bold">{APP_VERSION}</span>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
