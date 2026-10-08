import React, { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { writerExtensions } from './extensions';
import type { PaginationResult } from '../utils/pagination';
import { baseTextVars, contentCss } from '../utils/contentCss';
import { footerText, type PageLayout } from './Pagination';
import { pageGeometryPx, type PageSetup } from '../utils/pageSetup';
import type { DocNode } from '../utils/docJson';
import { useOfficeI18n } from '../../i18n';

/** Grey space between sheets in the page view, CSS pixels. */
const PAGE_GAP_PX = 24;

export interface WriterEditorProps {
  /** Content to start from: editor JSON or HTML. Read once, when the editor is created. */
  initialContent: DocNode | string;
  pageSetup: PageSetup;
  zoom: number;
  onReady: (editor: Editor) => void;
  onChange: (editor: Editor) => void;
  onPaginate: (result: PaginationResult) => void;
  pageCount: number;
}

/**
 * The page view. Sheets are drawn by the container (white, the page's width,
 * padded by the margins, tall enough for every page) and the Pagination
 * extension's gaps between them; the first page's header and the last page's
 * footer sit in the container's own margins.
 *
 * This directory is the only place that imports TipTap at run time (a test
 * checks it); the ribbon and dialogs drive the editor through its instance.
 */
export const WriterEditor: React.FC<WriterEditorProps> = ({
  initialContent,
  pageSetup,
  zoom,
  onReady,
  onChange,
  onPaginate,
  pageCount,
}) => {
  const { m } = useOfficeI18n();
  // The editor is created once; these refs let its callbacks see the current values.
  const textRef = useRef(m);
  textRef.current = m;
  const callbacks = useRef({ onChange, onPaginate });
  callbacks.current = { onChange, onPaginate };

  const editor = useEditor({
    extensions: writerExtensions({
      placeholder: () => textRef.current.writer.placeholder,
      tocTitle: () => textRef.current.writer.toc.title,
      tocEmpty: () => textRef.current.writer.toc.empty,
      onPaginate: (result) => callbacks.current.onPaginate(result),
    }),
    content: initialContent,
    autofocus: 'start',
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: 'writer-content',
        spellcheck: 'true',
        role: 'textbox',
        'aria-multiline': 'true',
      },
    },
    onUpdate: ({ editor: instance }) => callbacks.current.onChange(instance),
  });

  useEffect(() => {
    if (editor) onReady(editor);
    // onReady is the screen's setter; the editor instance is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const geometry = useMemo(() => pageGeometryPx(pageSetup), [pageSetup]);
  const layout: PageLayout = useMemo(
    () => ({
      contentHeight: geometry.contentHeight,
      pageWidth: geometry.width,
      marginTop: geometry.margins.top,
      marginBottom: geometry.margins.bottom,
      marginLeft: geometry.margins.left,
      gap: PAGE_GAP_PX,
      headerText: pageSetup.headerText,
      footerText: pageSetup.footerText,
      pageNumbers: pageSetup.pageNumbers,
      pageTemplate: m.writer.layout.pageTemplate,
    }),
    [geometry, pageSetup, m],
  );

  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.commands.setPageLayout(layout);
  }, [editor, layout]);

  // The editor ignores updates to `content`; the TOC and placeholder re-read
  // their text when the language changes once the view refreshes.
  useEffect(() => {
    if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false));
  }, [editor, m]);

  const minHeight = pageCount * geometry.height + (pageCount - 1) * PAGE_GAP_PX;
  const scale = zoom / 100;

  return (
    <div className="writer-canvas" style={{ ['--writer-zoom' as string]: scale }}>
      <style>{contentCss('.writer-sheet .writer-content')}</style>
      <div
        className="writer-zoom-frame"
        style={{ width: geometry.width * scale, height: minHeight * scale }}
      >
        <div
          className="writer-sheet"
          style={{
            width: geometry.width,
            minHeight,
            padding: `${geometry.margins.top}px ${geometry.margins.right}px ${geometry.margins.bottom}px ${geometry.margins.left}px`,
            transform: `scale(${scale})`,
            ['--page-margin-top' as string]: `${geometry.margins.top}px`,
            ['--page-margin-bottom' as string]: `${geometry.margins.bottom}px`,
            ...baseTextVars(pageSetup),
          }}
        >
          <div className="writer-page-header writer-first-header" aria-hidden="true">
            {pageSetup.headerText}
          </div>
          <EditorContent editor={editor} />
          <div className="writer-page-footer writer-last-footer" aria-hidden="true">
            {footerText(layout, pageCount, pageCount)}
          </div>
        </div>
      </div>
    </div>
  );
};
