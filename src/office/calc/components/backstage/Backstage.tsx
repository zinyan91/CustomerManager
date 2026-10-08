import React, { useState, useSyncExternalStore } from 'react';
import { FilePlus2, FileSpreadsheet, FolderOpen, Home, Info, Printer, Save, SaveAll } from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { DriveLink } from '../../../shared/archive/officeArchive';
import { BackstageShell } from '../../../shared/backstage/BackstageShell';
import { BlankTemplate } from '../../../shared/backstage/BlankTemplate';
import { InfoList, OpenPanel, SaveAsOption, SavePanel } from '../../../shared/backstage/panels';
import { RecentDrafts } from '../../../shared/backstage/RecentDrafts';
import type { CalcController } from '../../controller';
import { listCalcDrafts } from '../../services/calcDraftStore';
import { workbookStats } from '../../model/workbookStats';
import { PrintPanel } from './PrintPanel';

export type BackstageSection = 'home' | 'new' | 'open' | 'info' | 'save' | 'saveAs' | 'print';

export interface BackstageProps {
  controller: CalcController;
  title: string;
  /** Lúc lưu bản nháp gần nhất; null khi chưa lưu. */
  savedAt: number | null;
  initial: BackstageSection;
  /** Tệp trong Kho lưu trữ mà bảng tính đang gắn với. */
  archiveLink: DriveLink | null;
  /** Kết quả của lần lưu/mở Kho gần nhất: thành công hoặc lỗi. */
  notice: string | null;
  problem: string | null;
  onSaveToArchive: () => Promise<void>;
  onSaveToArchiveAs: () => void;
  onOpenFromArchive: () => void;
  onClose: () => void;
  onNew: () => void;
  onOpenDevice: () => void;
  onOpenDraft: (id: string) => void;
  onSaveNow: () => Promise<void>;
  onDownloadXlsx: () => void;
  onDownloadCsv: () => void;
  onHome: () => void;
  onMessage: (text: string) => void;
}

/** Màn "Tệp" của Bảng tính: khung chung, nội dung từng mục theo bảng tính. */
export const Backstage: React.FC<BackstageProps> = (props) => {
  const { controller } = props;
  const { m, lang } = useOfficeI18n();
  const t = m.ribbon.backstage;
  const [section, setSection] = useState<BackstageSection>(props.initial);
  useSyncExternalStore(controller.subscribe, controller.getVersion);
  const when = (ms: number) => new Date(ms).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');

  const items: Array<{ id: BackstageSection; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: t.nav.home, icon: <Home size={18} /> },
    { id: 'new', label: t.nav.new, icon: <FilePlus2 size={18} /> },
    { id: 'open', label: t.nav.open, icon: <FolderOpen size={18} /> },
    { id: 'info', label: t.nav.info, icon: <Info size={18} /> },
    { id: 'save', label: t.nav.save, icon: <Save size={18} /> },
    { id: 'saveAs', label: t.nav.saveAs, icon: <SaveAll size={18} /> },
    { id: 'print', label: t.nav.print, icon: <Printer size={18} /> },
  ];

  const blank = (
    <div className="calc-templates">
      <BlankTemplate icon={<FileSpreadsheet size={34} />} label={t.blank} onClick={props.onNew} />
    </div>
  );
  const recent = <RecentDrafts list={listCalcDrafts} icon={<FileSpreadsheet size={18} />} untitled={m.calc.untitled} onOpen={props.onOpenDraft} onError={props.onMessage} />;

  const stats = workbookStats(controller.wb);
  const content = (() => {
    switch (section) {
      case 'home':
        return (
          <>
            {blank}
            {recent}
          </>
        );
      case 'new':
        return blank;
      case 'open':
        return (
          <OpenPanel onOpenDevice={props.onOpenDevice} onOpenFromArchive={props.onOpenFromArchive}>
            {recent}
          </OpenPanel>
        );
      case 'info':
        return (
          <InfoList
            rows={[
              [t.info.name, props.title.trim() || m.calc.untitled],
              [t.info.location, t.info.locationValue],
              [t.info.modified, props.savedAt ? when(props.savedAt) : t.info.notSaved],
              ...(props.archiveLink ? ([[t.archivePath, props.archiveLink.path]] as Array<[string, string]>) : []),
              [t.info.sheets, String(stats.sheets)],
              [t.info.cells, stats.cells.toLocaleString()],
            ]}
          />
        );
      case 'save':
        return <SavePanel archiveLink={props.archiveLink} onSaveNow={props.onSaveNow} onSaveToArchive={props.onSaveToArchive} onSaveToArchiveAs={props.onSaveToArchiveAs} />;
      case 'saveAs':
        return (
          <div className="calc-save">
            <SaveAsOption icon={<FileSpreadsheet size={20} />} label={t.saveAsXlsx} onClick={props.onDownloadXlsx} />
            <SaveAsOption icon={<FileSpreadsheet size={20} />} label={t.saveAsCsv} onClick={props.onDownloadCsv} />
          </div>
        );
      case 'print':
        return <PrintPanel controller={controller} onMessage={props.onMessage} />;
    }
  })();

  return (
    <BackstageShell
      items={items}
      section={section}
      onSection={setSection}
      ariaLabel={m.calc.tabs.file}
      backLabel={t.back}
      closeLabel={m.calc.file.close}
      onHome={props.onHome}
      onClose={props.onClose}
      problem={props.problem}
      notice={props.notice}
    >
      {content}
    </BackstageShell>
  );
};
