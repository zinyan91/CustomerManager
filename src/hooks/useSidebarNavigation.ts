import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router';
import { useLang } from '../context/LanguageContext';
import { useModules } from '../context/ModulesContext';
import { useSidebarCollapse } from '../context/SidebarCollapseContext';
import { useIsMobile } from './useMediaQuery';
import { useSelectedCustomerId } from './useSelectedCustomerId';
import { visibleNavGroups } from '../lib/navigation';
import { filterNavGroups } from '../lib/modules';
import { visibleWorkspaceSections, workspaceItemOfPath, workspaceSectionOfPath } from '../lib/workspaceNavigation';

interface SidebarNavigationOptions {
  isOpenMobile: boolean;
  onCloseMobile?: () => void;
  canManageUsers: boolean;
  contextual: boolean;
  overlay: boolean;
}

export function useSidebarNavigation({ isOpenMobile, onCloseMobile, canManageUsers, contextual, overlay }: SidebarNavigationOptions) {
  const { t } = useLang();
  const { pathname } = useLocation();
  const customerId = useSelectedCustomerId();
  const mobile = useIsMobile();
  const { isSidebarCollapsed } = useSidebarCollapse();
  const { allowed } = useModules();
  const asideRef = useRef<HTMLElement>(null);
  const sections = useMemo(() => visibleWorkspaceSections(allowed, canManageUsers), [allowed, canManageUsers]);
  const currentSection = workspaceSectionOfPath(pathname);
  const activeId = workspaceItemOfPath(pathname)?.id;
  const current = sections.find(section => section.id === currentSection);
  const groups = contextual
    ? (isOpenMobile || overlay ? sections : sections.filter(section => section.id === currentSection))
    : filterNavGroups(visibleNavGroups(canManageUsers), allowed).map(group => ({
      id: group.groupKey,
      label: t(group.groupKey),
      items: group.items.map(item => ({ ...item, screenId: item.id })),
    }));

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
    t, customerId, isSidebarCollapsed, asideRef, activeId, current, groups,
    drawerVisible: overlay || mobile ? isOpenMobile : !isSidebarCollapsed,
  };
}
