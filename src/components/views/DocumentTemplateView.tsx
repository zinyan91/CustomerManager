import React, { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import { UI } from '../../lib/uiClasses';
import { useDocumentDossierController } from '../../hooks/useDocumentDossierController';
import { DossierWorkspace } from '../documents/dossier/DossierWorkspace';
import { DossierTreeRail } from '../documents/dossier/DossierTreeRail';
import { useSidebarCollapse } from '../../context/SidebarCollapseContext';
import { Button } from '../ui/Button';
import { Dialog, DialogContent, DialogTitle } from '../ui/Dialog';
import { useIsMobile } from '../../hooks/useMediaQuery';

export const DocumentTemplateView: React.FC = () => {
  const styles = UI;
  const dossierCtrl = useDocumentDossierController();
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useSidebarCollapse();
  const [treeOpen, setTreeOpen] = useState(false);
  const mobile = useIsMobile();

  return (
    <>
      {!mobile && !isSidebarCollapsed && <aside id="app-sidebar" className="hidden md:flex fixed top-[56px] bottom-0 left-[88px] w-[220px] z-30 border-r border-line/70 bg-panel">
        <DossierTreeRail ctrl={dossierCtrl} onCollapse={() => setIsSidebarCollapsed(true)} className="w-full h-full" />
      </aside>}
      <Dialog open={treeOpen} onOpenChange={setTreeOpen}>
        <DialogContent variant="drawer" hideCloseButton aria-describedby={undefined} style={{ left: 0, right: 'auto', width: 'min(288px,85vw)' }}>
          <DialogTitle className="sr-only">Bộ hồ sơ</DialogTitle>
          <DossierTreeRail ctrl={dossierCtrl} onCollapse={() => setTreeOpen(false)} onPicked={() => setTreeOpen(false)} className="h-full" />
        </DialogContent>
      </Dialog>
      <div data-workspace-page data-workspace-panel className="bg-panel overflow-hidden text-xs font-app">
        <DossierWorkspace styles={styles} ctrl={dossierCtrl} treeNavigation leading={
          <Button variant="secondary" className="md:hidden" aria-label="Mở cây hồ sơ" onClick={() => setTreeOpen(true)}>
            <PanelLeft className="w-4 h-4" />
          </Button>
        } />
      </div>
    </>
  );
};
