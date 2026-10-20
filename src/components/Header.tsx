import { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router';
import { useTheme } from '../context/ThemeContext';
import {
  Sun, Moon, Menu, X, LogOut, ShieldCheck, User, Search, Sparkles,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { LANGS, LANG_SWITCH_ENABLED } from '../lib/i18n';
import { useApiHealth } from '../hooks/useApiHealth';
import { useConfirm } from '../context/ConfirmContext';
import { UserScopeSelector } from './common/UserScopeSelector';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenAiChat?: () => void;
  isMobileMenuOpen?: boolean;
  showUserScope?: boolean;
}

export const Header = memo<HeaderProps>(({ onToggleMobileMenu, onOpenCommandPalette, onOpenAiChat, isMobileMenuOpen = false, showUserScope = true }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, role, fullName, isAdmin, signOut } = useAuth();
  const { lang, setLang, t } = useLang();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { reachable } = useApiHealth();
  const confirm = useConfirm();

  let navigate: (path: string) => void = () => {};
  try {
    const nav = useNavigate();
    navigate = nav;
  } catch {
    // fallback if rendered outside Router in tests
  }

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

  const roleLabel = role === 'master_admin'
    ? 'Master Admin'
    : role === 'user_admin'
    ? 'User Admin'
    : role === 'user'
    ? t('header.roleBanker')
    : t('header.roleNone');

  const ghostButton = 'p-1.5 rounded-xl text-ink-faint hover:text-ink hover:bg-panel-muted/80 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent cursor-pointer';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[56px] px-4 md:px-6 flex items-center justify-between bg-panel border-b border-line/70 shadow-xs">
      {/* Trái: Menu Nút + Brand Logo Capsule */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className={`md:hidden ${ghostButton}`}
          aria-label={isMobileMenuOpen ? t('header.closeMenu') : t('header.openMenu')}
        >
          {isMobileMenuOpen ? <X className="w-4 h-4 text-accent" /> : <Menu className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2.5 cursor-pointer text-left focus-visible:outline-none"
          title="Trang chủ / Tổng quan CRM"
        >
          <div className="relative inline-flex shrink-0">
            <Logo className="w-8 h-8" />
          </div>
          <h1 className="text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-ink truncate hover:text-accent transition-colors">
            {t('header.title')}
          </h1>
        </button>
      </div>

      {/* Giữa: Ô tìm kiếm nhanh dạng thanh nổi gọn gàng */}
      {onOpenCommandPalette && (
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2.5 w-full max-w-sm lg:max-w-md px-3.5 py-1.5 rounded-xl border border-line/70 bg-surface/70 hover:bg-surface text-ink-muted hover:text-ink hover:border-accent/50 text-xs transition-all cursor-pointer shadow-2xs group"
          title="Mở tìm kiếm nhanh (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-ink-faint group-hover:text-accent transition-colors" />
          <span className="flex-1 text-left truncate text-ink-faint group-hover:text-ink-muted">
            Tìm kiếm nhanh tính năng, khách hàng...
          </span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono rounded-md bg-panel border border-line text-ink-faint shadow-2xs">
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
            className={`sm:hidden ${ghostButton}`}
            title="Mở tìm kiếm nhanh (Ctrl + K)"
            aria-label="Tìm kiếm nhanh"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Bộ chọn tài khoản quản trị dữ liệu theo User (chỉ hiển thị cho Admin) */}
        {showUserScope && <UserScopeSelector className="hidden sm:block" />}

        {/* Nút Kích hoạt Trợ lý AI Tín dụng & Văn thư */}
        {onOpenAiChat && (
          <button
            type="button"
            onClick={onOpenAiChat}
            className={`${ghostButton} text-teal-600 dark:text-teal-400 hover:text-teal-700 hover:bg-teal-500/10`}
            title="Mở Trợ lý AI Tín dụng & Văn thư"
            aria-label="Trợ lý AI Tín dụng & Văn thư"
          >
            <Sparkles className="w-4 h-4" />
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
