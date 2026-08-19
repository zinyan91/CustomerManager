import { memo, useCallback } from 'react';
import { X } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { NAV_GROUPS } from '../lib/navigation';
import { APP_VERSION } from '../lib/appVersion';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar = memo<SidebarProps>(({
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { t } = useLang();

  const handleTabClick = useCallback((tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  }, [setActiveTab, onCloseMobile]);

  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed top-[var(--header-h)] inset-x-0 bottom-0 bg-surface/80 z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-[var(--header-h)] bottom-0 left-0 z-40 w-64 md:w-60 bg-panel border-r border-line flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden self-end m-2 p-1.5 rounded-md text-ink-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={t('header.closeMenu')}
        >
          <X className="w-4 h-4" />
        </button>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.groupKey} className={gi === 0 ? '' : 'mt-5'}>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                {t(group.groupKey)}
              </div>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center gap-2.5 pl-3 pr-3 py-1.5 rounded-r-lg border-l-2 text-xs text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                      isActive
                        ? 'border-accent bg-accent-soft text-accent font-semibold shadow-xs'
                        : 'border-transparent text-ink-muted hover:text-ink hover:bg-panel-muted/80'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors duration-150 ${isActive ? 'text-accent' : 'text-ink-faint'}`} />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-4 py-3 flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">{t('header.version')}</span>
          <span className="font-mono text-ink-muted">{APP_VERSION}</span>
        </div>
      </aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';
