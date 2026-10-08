import React, { useState } from 'react';
import { FilePlus2, FileText, FolderOpen, Home, Info, Printer, Save, SaveAll } from 'lucide-react';
import { useOfficeI18n } from '../../i18n';
import type { DriveLink } from '../../shared/archive/officeArchive';
import { BackstageShell } from '../../shared/backstage/BackstageShell';
import { BlankTemplate } from '../../shared/backstage/BlankTemplate';
import { InfoList, OpenPanel, SaveAsOption, SavePanel } from '../../shared/backstage/panels';
import { RecentDrafts } from '../../shared/backstage/RecentDrafts';
import { listDrafts } from '../services/draftStore';

export type WriterBackstageSection = 'home' | 'new' | 'open' | 'info' | 'save' | 'saveAs' | 'print';

export interface WriterBackstageProps {
  title: string;
  savedAt: number | null;
  initial: WriterBackstageSection;
  archiveLink: DriveLink | null;
  notice: string | null;
  problem: string | null;
  stats: { words: number; chars: number; pages: number };
  onClose: () => void;
  onHome: () => void;
  onNew: () => void;
  onOpenDevice: () => void;
  onOpenDraft: (id: string) => void;
  onOpenFromArchive: () => void;
  onSaveNow: () => Promise<void>;
  onSaveToArchive: () => Promise<void>;
  onSaveToArchiveAs: () => void;
  onDownloadDocx: () => void;
  onDownloadHtml: () => void;
  onDownloadTxt: () => void;
  onPrint: () => void;
  onError: (text: string) => void;
}

/** Màn "Tệp" của Văn bản: khung chung, nội dung từng mục theo văn bản. */
export const WriterBackstage: React.FC<WriterBackstageProps> = (props) => {
  const { m, lang } = useOfficeI18n();
  const t = m.ribbon.backstage;
  const w = m.writer;
  const [section, setSection] = useState<WriterBackstageSection>(props.initial);
  const when = (ms: number) => new Date(ms).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');

  const items: Array<{ id: WriterBackstageSection; label: string; icon: React.ReactNode }> = [
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
      <BlankTemplate icon={<FileText size={34} />} label={m.home.documentNew} onClick={props.onNew} />
    </div>
  );
  const recent = <RecentDrafts list={listDrafts} icon={<FileText size={18} />} untitled={w.untitled} onOpen={props.onOpenDraft} onError={props.onError} />;

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
              [t.info.name, props.title.trim() || w.untitled],
              [t.info.location, t.info.locationValue],
              [t.info.modified, props.savedAt ? when(props.savedAt) : t.info.notSaved],
              ...(props.archiveLink ? ([[t.archivePath, props.archiveLink.path]] as Array<[string, string]>) : []),
              [w.wordCount.words, props.stats.words.toLocaleString()],
              [w.wordCount.chars, props.stats.chars.toLocaleString()],
              [w.wordCount.pages, String(props.stats.pages)],
            ]}
          />
        );
      case 'save':
        return <SavePanel archiveLink={props.archiveLink} onSaveNow={props.onSaveNow} onSaveToArchive={props.onSaveToArchive} onSaveToArchiveAs={props.onSaveToArchiveAs} />;
      case 'saveAs':
        return (
          <div className="calc-save">
            <SaveAsOption icon={<FileText size={20} />} label={w.file.downloadDocx} onClick={props.onDownloadDocx} />
            <SaveAsOption icon={<FileText size={20} />} label={w.file.downloadHtml} onClick={props.onDownloadHtml} />
            <SaveAsOption icon={<FileText size={20} />} label={w.file.downloadTxt} onClick={props.onDownloadTxt} />
          </div>
        );
      case 'print':
        return (
          <div className="calc-save">
            <button type="button" className="wr-text-btn is-primary" onClick={props.onPrint}>
              <Printer size={16} />
              {w.file.print}
            </button>
            <p className="calc-dialog-text">{w.file.printHint}</p>
          </div>
        );
    }
  })();

  return (
    <BackstageShell
      items={items}
      section={section}
      onSection={setSection}
      ariaLabel={w.tabs.file}
      backLabel={t.back}
      closeLabel={w.file.close}
      onHome={props.onHome}
      onClose={props.onClose}
      problem={props.problem}
      notice={props.notice}
    >
      {content}
    </BackstageShell>
  );
};
