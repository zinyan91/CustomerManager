import { memo } from 'react';
import { Link, useLocation } from 'react-router';
import { LayoutDashboard, Users, TrendingUp, FolderArchive, Database, FileSignature, Boxes, Landmark, Settings, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { useSidebarCollapse } from '../context/SidebarCollapseContext';
import { useModules } from '../context/ModulesContext';
import { visibleWorkspaceSections, workspaceItemPath, workspaceSectionOfPath } from '../lib/workspaceNavigation';

const ICONS = { overview: LayoutDashboard, credit: Users, finance: TrendingUp, documents: FileSignature, dispatch: FolderArchive, storage: Database, retail: Boxes, reference: Landmark, system: Settings };

export const PrimaryRail = memo(({ canManageUsers = false }: { canManageUsers?: boolean }) => {
  const { pathname } = useLocation();
  const customerId = useSelectedCustomerId();
  const { isSidebarCollapsed, toggleSidebar } = useSidebarCollapse();
  const { allowed } = useModules();
  const current = workspaceSectionOfPath(pathname);
  const sections = visibleWorkspaceSections(allowed, canManageUsers);
  return (
    <nav className="fixed top-[56px] bottom-0 left-0 z-40 hidden md:flex flex-col items-center w-[88px] bg-[#13263e] border-r border-white/10 py-3 px-1.5 gap-1.5 overflow-y-auto" aria-label="Phân hệ">
      {sections.map(section => {
        const Icon = ICONS[section.id];
        const active = current === section.id;
        return (
          <Link key={section.id} to={workspaceItemPath(section.items[0], customerId)} aria-current={active ? 'page' : undefined}
            className={`w-full min-h-[62px] rounded-lg flex flex-col items-center justify-center gap-1.5 px-1 py-2 text-xs text-center leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${active ? 'bg-[#244663] text-sky-100 border border-[#47718f] font-semibold shadow-sm' : 'text-slate-300 border border-transparent hover:bg-white/10 hover:text-white'}`}>
            <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{section.label}</span>
          </Link>
        );
      })}
      {current !== 'dispatch' && current !== 'storage' && <button type="button" onClick={toggleSidebar} aria-label={isSidebarCollapsed ? 'Mở menu phụ' : 'Thu menu phụ'} aria-expanded={!isSidebarCollapsed} aria-controls="app-sidebar"
        className="mt-auto w-full min-h-11 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-300">
        {isSidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </button>}
    </nav>
  );
});
PrimaryRail.displayName = 'PrimaryRail';
