import React, { useCallback, useState } from 'react';
import { driveContext } from '../../../lib/drive/driveToken';
import { useOfficeI18n } from '../../i18n';
import { ArchiveDialog } from './ArchiveDialog';
import { archiveFileName, openFromArchive, overwriteInArchive, saveNewToArchive, type DriveLink } from './officeArchive';

export interface ArchiveDocumentOptions {
  initialLink: DriveLink | null;
  /** Đuôi tệp khi lưu. */
  extension: '.xlsx' | '.docx';
  /** Đuôi tệp được chọn khi mở. */
  openExtensions: readonly string[];
  /** Tên dùng khi tài liệu chưa có tên. */
  fallbackName: string;
  title: () => string;
  /** Xuất tài liệu đang mở thành tệp để ghi vào kho. */
  buildBlob: () => Promise<Blob>;
  /** Tài liệu vừa được gắn với một tệp trong kho (để nháp nhớ lại). */
  onLinkChange: (link: DriveLink) => void;
  onOpened: (file: File, link: DriveLink) => void;
  onNotice: (text: string) => void;
  onProblem: (text: string) => void;
}

/** Lưu tài liệu vào Kho lưu trữ và mở từ đó: tài liệu đã gắn với một tệp thì lưu là ghi đè đúng tệp ấy. */
export function useArchiveDocument(options: ArchiveDocumentOptions) {
  const { m } = useOfficeI18n();
  const t = m.ribbon.archive;
  const [link, setLink] = useState<DriveLink | null>(options.initialLink);
  const [dialog, setDialog] = useState<'open' | 'save' | null>(null);
  const { buildBlob, onLinkChange, onNotice, onProblem, onOpened } = options;

  const overwrite = useCallback(
    async (target: DriveLink) => {
      try {
        await overwriteInArchive(driveContext, target, await buildBlob());
        onNotice(t.saved(target.path));
      } catch (caught) {
        onProblem(t.saveFailed(caught instanceof Error ? caught.message : String(caught)));
      }
    },
    [buildBlob, onNotice, onProblem, t],
  );

  const saveToArchive = useCallback(async () => {
    if (link) await overwrite(link);
    else setDialog('save');
  }, [link, overwrite]);

  const element: React.ReactNode =
    dialog === null ? null : dialog === 'open' ? (
      <ArchiveDialog
        mode="open"
        extensions={options.openExtensions}
        onClose={() => setDialog(null)}
        onOpen={async (doc) => {
          let opened: Awaited<ReturnType<typeof openFromArchive>>;
          try {
            opened = await openFromArchive(driveContext, doc);
          } catch (caught) {
            throw new Error(t.openFailed(caught instanceof Error ? caught.message : String(caught)));
          }
          setDialog(null);
          onOpened(opened.file, opened.link);
        }}
      />
    ) : (
      <ArchiveDialog
        mode="save"
        extensions={options.openExtensions}
        defaultName={archiveFileName(options.title(), options.fallbackName, options.extension)}
        onClose={() => setDialog(null)}
        onSave={async (target) => {
          let made: DriveLink;
          try {
            made = await saveNewToArchive(driveContext, target, await buildBlob());
          } catch (caught) {
            throw new Error(t.saveFailed(caught instanceof Error ? caught.message : String(caught)));
          }
          setLink(made);
          onLinkChange(made);
          setDialog(null);
          onNotice(t.saved(made.path));
        }}
      />
    );

  return {
    link,
    saveToArchive,
    saveToArchiveAs: useCallback(() => setDialog('save'), []),
    openFromArchive: useCallback(() => setDialog('open'), []),
    dialog: element,
  };
}
