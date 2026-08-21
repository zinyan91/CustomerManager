import { useEffect, useState, useCallback, memo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Menu, LogOut, ShieldCheck, User, Search, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { LANGS, LANG_SWITCH_ENABLED } from '../lib/i18n';
import { useApiHealth } from '../hooks/useApiHealth';
import { useConfirm } from '../context/ConfirmContext';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Header = memo<HeaderProps>(({ onToggleMobileMenu, onOpenCommandPalette }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, role, fullName, isAdmin, signOut } = useAuth();
  const { lang, setLang, t } = useLang();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { reachable } = useApiHealth();
  const confirm = useConfirm();

  useEffect(() => {
    const len = () => setIsOnline(true);
    const xuong = () => setIsOnline(false);
    window.addEventListener('online', len);
    window.addEventListener('offline', xuong);
    return () => {
      window.removeEventListener('online', len);
      window.removeEventListener('offline', xuong);
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    const ok = await confirm({
      title: t('header.signOut'),
      message: t('header.signOutConfirm'),
      confirmText: t('header.signOut'),
      tone: 'danger',
    });
    if (ok) {
      signOut();
    }
  }, [confirm, t, signOut]);

  const roleLabel = role === 'admin'
    ? t('header.roleAdmin')
    : role === 'banker' ? t('header.roleBanker') : t('header.roleNone');

  const ghostButton = 'p-1.5 rounded-xl text-ink-faint hover:text-ink hover:bg-panel-muted/80 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[56px] px-4 md:px-6 flex items-center justify-between bg-panel/85 backdrop-blur-2xl border-b border-line/70 shadow-xs transition-all">
      {/* Trái: Menu Nút + Brand Logo Capsule */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className={`md:hidden ${ghostButton}`}
          aria-label={t('header.openMenu')}
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent-soft text-accent-ink font-mono text-xs font-black shadow-xs tracking-tighter">
            CM
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-pos ring-2 ring-panel" />
          </div>
          <h1 className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-ink truncate flex items-center gap-1.5">
            <span>{t('header.title')}</span>
            <Sparkles className="w-3 h-3 text-accent hidden sm:inline-block opacity-70" />
          </h1>
        </div>
      </div>

      {/* Giữa: Thanh Lệnh Tìm Kiếm Trọng Tâm Raycast / Linear Style */}
      {onOpenCommandPalette && (
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl border border-line/60 bg-surface/60 hover:bg-surface text-xs text-ink-muted hover:text-ink hover:border-accent/50 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-accent cursor-pointer shadow-2xs group w-48 sm:w-64 md:w-80 lg:w-96 mx-2"
          title="Tìm kiếm nhanh (Ctrl + K)"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-accent group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium">Tìm kiếm nhanh tính năng, khách hàng...</span>
          </div>
          <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-line/70 bg-panel-muted/60 text-[10px] font-mono text-ink-faint shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      )}

      {/* Phải: Cụm Công Cụ Điều Hành Capsule */}
      <div className="flex items-center gap-2 md:gap-3">
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="sm:hidden p-1.5 rounded-xl text-ink-faint hover:text-ink hover:bg-panel-muted/80 transition-all"
            title="Tìm kiếm (Ctrl + K)"
          >
            <Search className="w-4 h-4 text-accent" />
          </button>
        )}

        {/* Chấm Trực Tuyến Live Pulse */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface/50 border border-line/50 text-xs">
          <span className="relative flex h-2 w-2">
            {!isOnline ? (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neg" />
            ) : !reachable ? (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warn" />
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pos opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-pos" />
              </>
            )}
          </span>
          <span className={`text-[11px] font-semibold ${!isOnline ? 'text-neg' : !reachable ? 'text-warn' : 'text-ink-muted'}`}>
            {!isOnline ? t('header.offline') : !reachable ? t('header.serverUnreachable') : t('header.online')}
          </span>
        </div>

        {/* Bộ chuyển Ngôn Ngữ */}
        {LANG_SWITCH_ENABLED && (
          <div
            className="hidden sm:inline-flex rounded-xl border border-line/60 bg-surface/60 p-0.5 overflow-hidden"
            role="group"
            aria-label={t('header.language')}
          >
            {LANGS.map(l => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLang(l.key)}
                aria-pressed={lang === l.key}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-[0.08em] transition-all duration-150 cursor-pointer ${
                  lang === l.key ? 'bg-accent text-accent-ink shadow-2xs' : 'text-ink-faint hover:text-ink'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        {/* Nút Đổi Theme */}
        <button
          type="button"
          onClick={toggleTheme}
          className={ghostButton}
          aria-label={t('header.toggleTheme')}
          title={theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-warn" /> : <Moon className="w-4 h-4 text-accent" />}
        </button>

        {/* Thông Tin Người Dùng */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-surface/50 border border-line/50 text-xs text-ink-muted max-w-[260px]">
          {isAdmin ? <ShieldCheck className="w-3.5 h-3.5 text-accent" /> : <User className="w-3.5 h-3.5 text-ink-faint" />}
          <span className="truncate text-ink font-semibold" title={user?.email ?? undefined}>
            {fullName || user?.email}
          </span>
          <span className="text-ink-faint text-[10px]">· {roleLabel}</span>
        </div>

        {/* Nút Đăng Xuất */}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-ink-muted hover:text-neg hover:bg-neg-soft/30 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs font-semibold">{t('header.signOut')}</span>
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
