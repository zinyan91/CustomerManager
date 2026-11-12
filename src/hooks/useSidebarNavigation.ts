import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { useLang } from '../context/LanguageContext';
import { useModules } from '../context/ModulesContext';
import { useSelectedCustomerId } from './useSelectedCustomerId';
import { useAuth } from '../context/AuthContext';
import { ADMIN_NAV } from '../lib/adminNav';
import {
  visibleWorkspaceSections, withWorkspaceSection, workspaceItemOfPath, workspaceSectionOfPath,
  type WorkspaceSection, type WorkspaceSectionId,
} from '../lib/workspaceNavigation';

interface SidebarNavigationOptions {
  isOpenMobile: boolean;
  onCloseMobile?: () => void;
  isMasterAdmin: boolean;
}

export function useSidebarNavigation({ isOpenMobile, onCloseMobile, isMasterAdmin }: SidebarNavigationOptions) {
  const { t } = useLang();
  const { pathname } = useLocation();
  const customerId = useSelectedCustomerId();
  const { allowed } = useModules();
  const { can } = useAuth();
  const asideRef = useRef<HTMLElement>(null);
  const sections = useMemo(() => visibleWorkspaceSections(allowed, isMasterAdmin), [allowed, isMasterAdmin]);
  const currentSection = workspaceSectionOfPath(pathname);
  const activeId = workspaceItemOfPath(pathname)?.id;
  const canManageUsers = can('user.manage');
  const groups = useMemo(() => {
    if (currentSection !== 'admin' || !canManageUsers) return sections;
    const adminSection: WorkspaceSection = {
      id: 'admin', label: 'Quản trị',
      items: ADMIN_NAV.filter(item => !item.capability || can(item.capability)).map(item => ({
        id: item.id === 'overview' ? 'admin' : `admin-${item.id}`,
        screenId: 'admin' as const, path: item.path, icon: item.icon,
        label: item.label, keywords: [item.label], task: true,
      })),
    };
    return withWorkspaceSection(sections, adminSection);
  }, [sections, currentSection, canManageUsers, can]);

  // Chuyển sang phân hệ khác thì mở phân hệ đó, bỏ lựa chọn đóng/mở cũ
  const [opened, setOpened] = useState<{ route?: WorkspaceSectionId; id?: WorkspaceSectionId }>({ route: currentSection, id: currentSection });
  const openId = opened.route === currentSection ? opened.id : currentSection;
  const toggleSection = (id: WorkspaceSectionId) => setOpened({ route: currentSection, id: openId === id ? undefined : id });

  useEffect(() => {
    if (!isOpenMobile) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    asideRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseMobile?.();
      if (event.key !== 'Tab') return;
      const focusable = Array.from(asideRef.current?.querySelectorAll<HTMLElement>('a, button') ?? [])
        .filter(element => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [isOpenMobile, onCloseMobile]);

  return {
    t, customerId, asideRef, activeId, currentSection, groups, openId, toggleSection,
    drawerVisible: isOpenMobile,
  };
}
