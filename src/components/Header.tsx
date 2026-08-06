import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Menu, LogOut, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { LANGS, LANG_SWITCH_ENABLED } from '../lib/i18n';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, role, fullName, isAdmin, signOut } = useAuth();
  const { lang, setLang, t } = useLang();
  const [isOnline, setIsOnline] = useState<boolean | null>(true);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const { error } = await supabase.from('Customers').select('Id').limit(1);
      setIsOnline(!error);
    } catch {
      setIsOnline(false);
    }
  };

  const roleLabel = role === 'admin'
    ? t('header.roleAdmin')
    : role === 'banker' ? t('header.roleBanker') : t('header.roleNone');

  const ghostButton = 'p-1.5 rounded-md text-ink-faint hover:text-ink hover:bg-panel-muted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[var(--header-h)] px-3 md:px-5 flex items-center justify-between bg-panel border-b border-line">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className={`md:hidden ${ghostButton}`}
          aria-label={t('header.openMenu')}
        >
          <Menu className="w-4 h-4" />
        </button>

        <span className="hidden sm:flex items-center justify-center w-7 h-7 rounded-md border border-line-strong font-mono text-[11px] font-bold text-ink">
          CM
        </span>
        <h1 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink truncate">
          {t('header.title')}
        </h1>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <span className="hidden md:flex items-center gap-1.5 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${isOnline === false ? 'bg-neg' : 'bg-pos'}`}
            aria-hidden="true"
          />
          <span className={isOnline === false ? 'text-neg font-semibold' : 'text-ink-muted'}>
            {isOnline === false ? t('header.offline') : t('header.online')}
          </span>
        </span>

        {LANG_SWITCH_ENABLED && (
        <div
          className="hidden sm:inline-flex rounded-md border border-line overflow-hidden"
          role="group"
          aria-label={t('header.language')}
        >
          {LANGS.map(l => (
            <button
              key={l.key}
              type="button"
              onClick={() => setLang(l.key)}
              aria-pressed={lang === l.key}
              className={`px-2 py-1 text-[10px] font-bold tracking-[0.08em] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                lang === l.key ? 'bg-accent-soft text-accent' : 'text-ink-faint hover:text-ink'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className={ghostButton}
          aria-label={t('header.toggleTheme')}
          title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <span className="hidden lg:flex items-center gap-1.5 text-xs text-ink-muted max-w-[260px]">
          {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-ink-faint" /> : <User className="w-3.5 h-3.5 text-ink-faint" />}
          <span className="truncate text-ink" title={user?.email ?? undefined}>
            {fullName || user?.email}
          </span>
          <span className="text-ink-faint">· {roleLabel}</span>
        </span>

        <button
          type="button"
          onClick={() => {
            if (window.confirm(t('header.signOutConfirm'))) {
              signOut();
            }
          }}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-ink-muted hover:text-neg transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('header.signOut')}</span>
        </button>
      </div>
    </header>
  );
};
